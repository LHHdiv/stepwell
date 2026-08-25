---
title: 第13讲·主循环精读（上）：相位状态机与 preStep 关卡
summary: 拆解 agent.ts 上半场：Phase 三态、kick 驱动循环、turn 开边界与 preStep 瀑布的完整流程。
objectives:
  - 画出 Phase 状态机的三态及其迁移条件
  - 逐段读懂 kick → turn → preStep 的调用链
  - 解释"空轮次"为什么必须存在且不花模型调用
tags: [deepseek-harness, agent-loop, 源码精读]
keyPoints:
  - 相位三态 idle / maintenance / running，一切状态迁移都经 setPhase 并广播 agent/status
  - kick 是 while(await this.turn()){} 的简单循环——复杂度全部下沉到 turn 内部
  - preStep = 领取输入 + 组装提示词 + agent/pre-step 瀑布裁决，返回 enter 或 reject
  - 被拒绝或改写为空的首次领取仍拥有 turn 边界：日志记录这次尝试，但零模型调用
---

本讲开始啃全仓库最核心的文件：`packages/core/agent-loop/src/agent.ts`，515 行。一次读完不现实，我们分两讲：本讲上半场——智能体怎么被唤醒、一轮怎么打开、输入怎么过关；下一讲下半场——模型请求怎么发出、工具怎么调度、各种异常路径怎么收场。

## 一、Phase：三种相位的状态机

主循环的一切行为都由一个 `phase` 字段驱动。源码定义：

```ts
type Phase =
  | { kind: 'idle'; lastTurn: number }              // 空闲：记得上次转到几号
  | { kind: 'maintenance'; abort: AbortController;  // 维护中：跑压缩等家务
      lastTurn: number; wakeRequested: boolean }
  | { kind: 'running'; abort: AbortController;      // 运行中：正在驱动 turn/step
      turn: number; step: number; wakeRequested: boolean }
```

三个要点：

1. **每个非 idle 相位自带一个 AbortController**——取消就是调它的 `abort(cause)`，信号会贯穿后续所有异步操作（第 08 讲见过的 `signal.throwIfAborted()` 散布在循环各处）；
2. **wakeRequested 是"唤醒闩锁"**：运行或维护期间来了唤醒请求，无法立刻处理，就闩住；相位收敛回 idle 时检查闩锁，有待办且有排队消息就再次点火（kick 的 finally 块和 wakeDriver 里都有这段逻辑）；
3. **一切迁移走 setPhase()**，它对比迁移前后的对外 status（idle/running 二值），变化时广播 `agent/status` 事件——UI 的"对方正在输入…"指示灯就是这么亮的。

为什么用判别联合而不用几个布尔位？因为三种相位互斥且各有专属字段——布尔组合会出现"maintenance 且 running"这种非法状态的容身之处。**让非法状态无法被表达**，是类型系统给状态机的第一份礼物。

## 二、点火：wakeDriver 与 kick

外部调用 `send(..., wakeup=true)` 后发生什么？`wakeDriver` 接管：

- 若当前 idle：创建新的 running 相位（AbortController 就绪、step 归零），然后在 `loopCtx.agents.withInitiator(this, ...)` 的包裹下启动 `kick()`；
- 若不在 idle：按规则闩锁——维护中的唤醒必闩；已取消活动的唤醒（wakingAfterAbort）闩住等收敛；唯独 disposed（销毁）不闩，"teardown waits on no model turn"——拆机器时不该再等一轮模型对话。

`kick()` 出人意料地短：

```ts
private async kick(): Promise<void> {
  try {
    while (await this.turn()) {}        // turn 返回 true 就继续转
  } catch (_error) {
    // 失败已在各自的活边界上报过（throwError 先 emit agent/error 再抛）
  } finally {
    if (this.phase.kind === 'running') {
      const { turn, wakeRequested } = this.phase
      this.setPhase({ kind: 'idle', lastTurn: turn })
      if (wakeRequested && this.inbox.hasPending) this.wakeDriver()  // 放行闩锁
    }
  }
}
```

`while (await this.turn()) {}`——turn 返回 true 表示队列里还有活干（换了个新 AbortController 继续下一个轮次），false 表示彻底没活。**循环的骨架只有一句 while**，所有复杂度都被推入 turn 内部。错误处理也值得学：catch 里什么都不做不是偷懒，而是因为每个错误已经在自己的活动边界上通过 `throwError` 广播过 `agent/error` 了——**上报与传播分离**，避免同一错误被层层重复报告。

## 三、turn()：开边界与步骤循环

`turn()` 承担一个轮次的完整生命周期，骨架如下（有删节）：

```ts
const turn = phase.turn + 1
this.session.append('turn/start', { turn })   // ① 开边界：先落盘再干活
let target: InboxTarget = 'next-turn'
while (true) {
  const step = phase.step + 1
  const decision = await this.preStep(target, { turn, step })   // ② 过关卡
  if (decision.kind === 'reject') { turnEnds = { kind: 'blocked' }; return false }
  if (phase.step === 0 && decision.messages.length === 0) {     // ③ 空首轮
    turnEnds = { kind: 'completed' }; return false
  }
  this.session.append('step/start', { turn, step })
  try {
    for (const message of decision.messages)
      this.session.append('user/message', message, { surfaceOp: 'append' })  // ④ 入账
    const stepEnd = await this.step(decision.assembly)                        // ⑤ 干活（下讲）
    // max-tokens 有粘性：一旦任何 step 触顶，后续正常完成的 step 不许降级轮次结局
    if (turnEnds === null || turnEnds.kind !== 'max-tokens') turnEnds = stepEnd
  } finally {
    this.session.append('step/end', { turn, step })
  }
  if (turnEnds && this.inbox.nextStep.length === 0) {
    await this.dispatch.serial('agent/turn-stopping', { turn, signal })       // ⑥ 收尾裁决
    if (this.inbox.nextStep.length === 0) break
  }
  target = 'next-step'
}
```

五个看点：

**① 先写日志再做事。** turn/start 落盘成功才继续——如果 append 都失败（比如存储坏了），直接 throwError 终止。顺序不能反：先干活后记账，崩溃时就会留下"做了事却无账可查"的黑洞。

**② ③ 合起来是本讲的题眼——空轮次。** 首次领取被插件拒绝（blocked）或被改写成空消息集时，代码依然走完 turn/start…turn/end 的完整闭环，只是不启动任何 step、不发任何模型请求。回忆第 02 讲："宁可记录空转也不丢历史"。用户发了条消息却被策略拦下，这件事本身是必须留痕的事实——UI 要显示"被拦截"，审计要能复盘。**边界属于历史，代价为零；内容才花钱。**

**④ max-tokens 的粘性设计**：某一步因输出超限戛然而止后，哪怕后面重试的步骤正常完成，轮次的最终定性仍然是 max-tokens——不许"后来者洗白"。一个小小的业务规则，写出了对因果诚实的态度。

**⑥ turn-stopping 只在真正收尾时触发**：轮次要结束、且 next-step 队列已空——这个串行事件给插件最后一次发言权（第 02 讲说过它是没有 next() 的裁决者）。注意 break 前还查了一次队列：万一监听者在 stopping 期间又塞了转向消息，轮次就得继续。

## 四、preStep：一道瀑布关卡

每一步的起点是 `preStep`，它把三件事串成一条流水线：

```ts
const claimed = this.inbox.claim(target, position.turn)          // ① 领取输入
const assembly = await this.loopCtx.systemPrompt.assemble(...)   // ② 组装提示词骨架
const decision = await this.dispatch.waterfall(
  'agent/pre-step', { messages: claimed, ...position, signal },
  () => Promise.resolve({ kind: 'enter',
    messages: context === undefined ? claimed : [...claimed, context] }),
)                                                                 // ③ 瀑布裁决
```

①从收件箱领取目标队列的消息（领取即出队，配合 inbox/claimed 事件全程留痕）；②向 system-prompt 服务要一份 PromptAssembly（片段+工具清单，下一卷细讲）；③把决定权交给 waterfall 监听链：默认决策是放行（enter），途中任何插件可以往消息列表追加注入上下文（runtimeContext 投影出的环境信息就在这里搭车）、改写内容，或者干脆 reject。

还记得第 03 讲的洋葱模型吗？这就是它最重要的实战现场：**权限插件短路 = 拒绝；上下文插件加工 = 包装后委托**。一个函数，两种扩展范式同台演出。

> 💡 **知识拓展：读长函数的心法**
> turn() 连注释带逻辑约 90 行，读法是"先抓骨架再抠细节"：第一遍只看 append 了哪些事件（start/end 对称出现），画出事件时间线；第二遍再看控制流（break/return/finally 各自对应什么结局）；第三遍才抠具体表达式。三层递进，每层都有完整收获——永远不要第一遍就想读懂每一行。

## 试一试

在 agent.ts 里找到 `whenIdle()` 实现（约 8 行）。它为什么用 do-while 循环反复 await activityDone，而不是只等一次？（提示：想想"等待期间恰好有新工作点火"的场景。）这道题想通，你对异步收敛的理解就更进一步了。

## 下一讲预告

关卡过了，消息入了账，接下来是真正的生产环节：buildRequest 组装冻结请求、流式碎片实时落账、agent/request-error 的重试瀑布、以及工具调度器 executeToolCalls 的并发艺术——515 行的下半场。
