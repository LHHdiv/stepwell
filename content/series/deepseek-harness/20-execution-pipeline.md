---
title: 第20讲·执行流水线：一次工具调用的完整旅程
summary: 沿官方流水线图走完全程：落账、意图门、审批、around 派发、规范化、finalize 到结果事件。
objectives:
  - 背出流水线的主要关卡及顺序
  - 解释"先落账再执行"与"失败也规范化为结果"两条铁律
  - 理解 around-dispatch 与前后瀑布的分工
tags: [deepseek-harness, 执行流水线, 安全]
keyPoints:
  - tool/call 在执行前落账——模型发出的调用是既成事实，必须留痕
  - pre-execute 瀑布管准入（hooks/权限/沙箱/审批），execute 瀑布管环绕（超时/重试/指标）
  - 一切异常最终都规范化为 isError 的 tool/result——模型永远拿到结构化的结局
  - 结果上下文经 FIFO 注入下一条 user/message，工具可以给后续步骤递纸条
---

第 14 讲我们看过调度器怎么把工具调用排上跑道，本讲进入跑道本身：官方 `docs/tool-execution-pipeline.zh.md` 用一张流程图画尽了一次调用的全部关卡。这张图值得打印出来贴墙上看——我们把它的每个节点配上源码级的解释。

## 一、全景图：十四个站点

```text
模型的 tool-call 块
  → ① tool/call 落账（执行前！）
  → ② presentCall → UI 显示"执行中"卡片
  → ③ tools/pre-execute 瀑布（hooks · 权限 · 沙箱）
  → ④ 注册的单调守卫（deny / abstain；身份受保护）
  → ⑤ 审批：ctx.approval 一次性提问（无人应答 = 拒绝）
  → ⑥ tools/execute 瀑布（超时 · 重试 · 指标 —— around 派发）
  → ⑦ 工具 execute() 函数体真正运行
  → ⑧ fs/write-intent / fs/edit-intent（tool-fs 的写入门）
  → ⑨ 工具自有会话事件（todo/write、fs/observed、hook/*…）
  → ⑩ tools/post-execute 瀑布（accept / block / replace / 追加上下文）
  → ⑪ 注册表外层规范化（流水线抛错 → isError 结果）
  → ⑫ finalizeContent（内容层最后一道不变量）
  → ⑬ tool/result 落账 + UI 完成卡片
  → ⑭ 额外上下文按 FIFO 注入后续 user/message
```

## 二、三条铁律

**铁律一：先落账，再执行。** ①的位置在一切之前。模型的调用一经产出就是既成事实——无论后面被批准还是拒绝，`tool/call` 事件已经在日志里了。被拒的调用随后会有一个说明原因的结果事件配对（callId 关联，第 06 讲）。为什么这么偏执？"模型想干这件事"本身就是重要的审计事实：安全团队要统计攻击尝试，产品要分析误用模式。**日志记录行为，不只为成功的行为负责。**

**铁律二：失败也是结果。** 看⑪："pipeline/result snapshot throws become isError"。守卫抛异常、审批组件崩溃、execute 半路炸掉——所有这些不走寻常路的出口，最终都被注册表的外层规范化捕获，变成一个带 isError 标记的结构化 tool/result 落账。模型永远不会面对"调用消失"的灵异事件；它总能读到结构化的结局并决定下一步。这和第 14 讲调度器"给未启动调用补合成中止结果"是同一条哲学：**因果链不许断链。**

**铁律三：策略归瀑布，能力归函数体。** ③⑥⑩三道瀑布各司其职：

- **pre-execute（前置）**：准入裁决。监听者可以 deny（拒绝）、ask（转人工审批）、放行。第 03 讲说的"短路是策略插件的合法武器"主战场就在这；
- **execute（环绕）**：注意官方文档称其为 **around dispatch**（环绕派发）——监听者包着函数体跑，所以能实现超时包装（tool-call-timeout-policy 就是它）、重试、耗时统计这类"包围式"增强；
- **post-execute(后置)**：对结果的最终处置——接受、拦截、替换内容、或追加上下文。

## 三、两个精妙的支线设计

**单调守卫（monotonic guards）**：④是一组特殊的检查器，只能 deny 或 abstain(弃权)，且"identity protected"——身份受保护，谁投的否决票不可被冒充。为什么叫"单调"？因为它们只朝一个方向用力：否决权人人可有，放行权不在它们手里。这与瀑布的协作式委托形成互补——**需要商量的事走瀑布协商，底线问题走守卫一票否决**。

**审批的一次性语义**：⑤的 ctx.approval 是"one-shot prompt"——向用户发出一次批准询问，注释明确"absent or unanswerable: deny"：审批服务不存在？拒绝。用户没回应？拒绝。没有默认放行这个选项。结合第 07 讲的 fail-loud 哲学，你会发现 dsh 对"危险操作"的态度是彻底一致的：**不确定性即否定**。

**上下文的 FIFO 递纸条**：⑭很有想象力——post-execute 里监听者可以往"活跃批次的 additionalContexts"里塞东西，这些内容会在结果落账后按先进先出注入成 user/message。用途：工具 A 的结果让插件意识到"模型接下来八成需要 B 的信息"，就提前把 B 塞进去。这是 agent.inject()（第 12 讲）在工具粒度上的微缩版。

## 四、UI 卡片：presentCall 与 presentResult

②和⑬容易被忽略，但它们揭示了另一个消费者契约。ToolSchema 相关的 presentation 层（presentation.ts，389 行）定义了工具如何把参数渲染成"执行中"卡片、把结果渲染成完成卡片——同一份 canonical value（第 18 讲），UI 卡片和模型内容各自投影。你在聊天界面看到的漂亮 diff 卡片、终端输出折叠块，全是这两个钩子的作品。

> 💡 **知识拓展：中间件拓扑的三种形态**
> 本讲的流水线集齐了三种扩展点形态：**责任链**（pre-execute，逐个裁决可短路）、**洋葱/环绕**（execute，包装函数体）、**后处理管道**(post-execute，对产物加工)。下次你设计任何"带插件的系统"，可以先画一张这样的拓扑图：每种需求放进最合适的形态——准入类进责任链、增强类进环绕、整形类进后处理。混乱的插件系统多半是把三种需求全塞进了同一种形态。

## 试一试

对照 `docs/tool-execution-pipeline.zh.md` 的原图找一处本讲没细讲的节点（比如 hook/invoked 事件），推测它的工作方式，然后去源码验证。这个"预测-验证"循环是读源码进步最快的方式——你已经具备完整的知识基础来玩这个游戏了。

## 下一讲预告

流水线里的两道安全关卡值得单独放大：沙箱如何包装 argv 让进程"出生即在牢笼"，审批流如何在自动化与人之间分配决策权。下一讲拆 sandbox 家族与审批机制。
