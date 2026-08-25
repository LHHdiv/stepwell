---
title: 第14讲·主循环精读（下）：流式请求、重试瀑布与工具调度
summary: 拆解 agent.ts 下半场：buildRequest 冻结请求、chunk 实时落账、request-error 重试、executeToolCalls 并发调度。
objectives:
  - 读懂 step() 的 while(true) 内循环与三种退出条件
  - 解释 agent/request-error 瀑布如何决定重试还是抛错
  - 描述 executeToolCalls 的屏障-并发混合调度模型
tags: [deepseek-harness, agent-loop, 工具调度]
keyPoints:
  - 每个流式 chunk 立即 append 进日志——崩溃恢复后逐 token 保真
  - 中断时已送达的前缀以 interrupted:true 的 assistant/message 落账，不丢一个字
  - 请求出错先过 agent/request-error 瀑布：监听者可裁决 retry，否则抛 LlmError
  - 工具调用按"独占调用成屏障、普通调用进有界并发池"调度，结果按模型顺序提交
---

上半场我们看着一条消息过关卡、入账本。下半场进入生产车间：`step()` 函数——一次模型请求的完整生命。它是全文件最长的函数，但骨架是一个清晰的 `while (true)` 内循环：

```text
构建冻结请求 → 流式接收（每个 chunk 落账） → 出错走重试瀑布（continue 再来）
→ 成功则落 assistant/message → 无工具调用? completed : 执行工具 → 结论?
```

## 一、buildRequest：把请求变成"冻结的证据"

每次请求前，`buildRequest` 做四件事，件件都在为第 07 讲的宪法服务：

**① 配置提案。** 从日志里读上次记录的 request/header 作为种子配置，经 `agent/request` 瀑布让插件提案修改（换模型、调温度……）。细节见功力：适配器派生的默认值要先摘掉再给插件看（`requestProposal` 函数）——否则插件会在别人填好的默认值上做无意义的微调。若瀑布后连 provider/model 都没有？直接抛错："set AgentOptions.provider and AgentOptions.model or supply both via the agent/request waterfall"——错误信息告诉你两条修复路径。

**② 解析适配器。** `llm.prepareCall(proposedConfig)` 把配置绑定到具体的适配器实现。注意对 NO_ADAPTER 错误的特殊处理：中间件可能服务一个未注册的路由，此时允许继续（终端派发时再要求适配器）。

**③ 头部记账。** 组装 canonical header 后对比日志基线：第一次记 `initial`、实例重启后续跑记 `resume`、内容变了记 `change`——没变就不记。路由上下文（request/context）同理只在变化时追加。**日志记录差异而非快照全集**，这是仅追加系统控制体积的标准手法。

**④ 深度冻结。** 最终请求对象经过 `deepFreeze(structuredClone(...))`——克隆出独立副本再递归冻结。从这一刻起，任何代码都物理上无法篡改这次请求的内容。发出去的东西就是日志里记下的东西，就是将来审计时看到的东西。

## 二、流式接收：每个 chunk 都值得被记住

拿到流之后是整个文件最动人的几行：

```ts
for await (const chunk of stream) {
  signal.throwIfAborted()   // 每个 chunk 之间都检查取消
  chunkSeqs.push(this.session.append('assistant/chunk', { turn, step, chunk }).seq)
  assembler.push(chunk)     // 同时喂给组装器拼完整消息
}
```

每飞回一个碎片，立刻写进日志并记下它的 seq 号。为什么这么偏执？两个理由：

**保真回放**：UI 重演对话时不依赖任何外部缓存，纯靠日志就能一比一还原打字机效果；

**中断不丢字**：看 catch 分支——如果流中途被取消（signal.aborted），已送达的内容不会扔掉，而是立即组装成一条带 `interrupted: true` 标记的 assistant/message 落账（sourceEventSeqs 引用全部 chunk 的 seq）。用户看到一半的回答，重启后还在。**取消 ≠ 作废，已发生的事实必须存档。**

## 三、agent/request-error：重试的裁决庭

流正常结束但结论是 error/aborted 时，代码不直接抛错，而是先开一次瀑布听证会：

```ts
const action = await this.dispatch.waterfall('agent/request-error',
  { turn, step, provider, failure: finish.failure,
    retryPolicy: preparedCall?.retryPolicy, signal },
  () => Promise.resolve(undefined),
)
if (action?.kind !== 'retry') throw new LlmError(...)
continue   // 监听者裁决 retry → 回到 while(true) 开头重新构建请求
```

默认裁决是"不重试直接抛"；任何监听者可以返回 `{ kind: 'retry' }` 让循环再来一轮。这个设计把重试策略从循环里完全剥离：限速退避插件、故障转移插件（主模型挂了换备用模型）、熔断器……全都以监听者身份接入，循环本身一行不改。又见第 03 讲的教条：**策略用事件，能力用服务**。

## 四、executeToolCalls：屏障与并发池的混合调度

回复里有 tool-call 块时，`tool-calls.ts` 的调度器登场。它的头部注释浓缩了全部设计：

> 独占（exclusive）调用构成屏障；普通调用进入有界滚动并发池并在开始前可被重分类。派发可以重叠，而策略、结果和结果上下文保持模型顺序。

拆开说。模型的多个工具调用分两类执行模式：

- **exclusive（独占）**：比如"删除文件"这种不能和别的操作并行的危险动作。遇到它，调度器先等前面所有调用收尾，让它**独占一个屏障区间**跑完，后面的调用才继续；
- **普通调用**：进入一个有界并发池同时开跑（读三个文件何必串行排队），但**提交结果的顺序永远等于模型产出调用的顺序**——并发是执行层面的优化，模型看到的因果链绝不乱序。

异常路径同样周全：取消时，已启动的调用照常收尾提交，未启动的调用补一条**合成的中止结果**（TOOL_ABORTED_BEFORE_DISPATCH）——没有这条假结果，重放日志时模型会看到一个"发出调用却永远没有回应"的悬案，历史就不自洽了。而如果是调度器自身崩溃（内部失败），则**绝不伪造结果**：保留已有的 tool/call 记录、抛出第一个失败。两种失败，两种态度：环境中断可以代笔善后，自己的 bug 不许掩盖。

工具执行产生的上下文通过回调塞回 `next-step` 收件箱，成为下一个步骤边界的输入——循环由此续上。

## 五、退出条件：step 循环的三种终局

回到外层视角，step() 的 while(true) 有三种出口：

1. `finish.kind === 'max-tokens'` → 返回 max-tokens 结局（粘性规则见上一讲）；
2. 回复里没有工具调用 → completed，轮次可以自然收尾；
3. 有工具调用且其中某个结果标记了 concludesTurn → 也算 completed（工具可以宣布"这事办完了"）；
4. 否则（工具跑完还有后续）→ 返回 null，turn() 里检查 next-step 队列决定继续下一步还是收轮。

配合上一讲的 preStep 关卡和 turn 边界，整台发动机的全部控制流就此闭环。515 行，你现在每一行都有归属了。

> 💡 **知识拓展：结构化并发的一瞥**
> "有界池 + 屏障 + 保序提交"是结构化并发（structured concurrency）思想的局部应用：并发任务的生命周期被严格框在父操作（本次 step）之内，取消沿信号树传播，结果收集与执行顺序解耦。Kotlin 协程、Swift TaskGroup 都是同一思想。核心信条：**并发可以乱序执行，但对外呈现的因果必须有序**。

## 试一试

打开 `packages/core/agent-loop/src/tool-calls.ts`，找到 GroupOutcome 接口里的 `concluded` 字段注释，回答：一个工具要满足什么条件才能"宣布轮次结束"？再想想这个能力和第 12 讲的五个动词里的哪一个形成呼应？

## 下一讲预告

preStep 里那句 `systemPrompt.assemble(...)` 我们一路当成黑盒。下一讲打开它：提示词片段怎么注册、工具 schema 怎么并入、以及那个在请求前一刻注入环境上下文的 runtime-context 投影——智能体的"世界观"是如何组装的。
