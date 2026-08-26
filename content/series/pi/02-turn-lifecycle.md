---
title: 第02讲·一次对话的生命线：从 prompt 到下一轮
summary: 顺着依赖图最关键的心脏路径，追踪一次对话从敲下提示词到工具执行再回到下一轮的完整数据流。
objectives:
  - 画出"提示词 → prompt() → runLoop → 流式响应 → 工具派发 → 下一轮"的时序
  - 说清 runLoop 内外双层 while 各自负责什么
  - 解释 TUI 如何在不感知 agent 的前提下把事件渲染成屏幕
tags: [pi, agent-loop, 生命周期]
keyPoints:
  - 入口：InteractiveMode 的 while(true){ getUserInput(); session.prompt() }（interactive-mode.ts:1094）
  - 驱动：AgentSession.prompt()（agent-session.ts:1116）唤醒 pi-agent-core 的 Agent，进入 runWithLifecycle（agent.ts:486）
  - 主循环：runLoop（agent-loop.ts:155）外层 drain 后续消息、内层跑工具/转向步骤；streamAssistantResponse（:281）用 convertToLlm 映射消息格式
  - 工具：executeToolCalls（:411）顺序（:433）/ 并发（:489）；结果回灌循环进入下一轮
  - TUI 不认识 agent：interactive-mode.ts:3068 的 handleEvent 把 message_start/toolCall 映射成组件，再 requestRender()
---

上一讲我们把 11 个包铺成七层地图。这一讲不拆单个零件，而是顺着地图里最粗的那条线——**一次对话的生命线**——把数据从头到尾走一遍。走完你会发现：pi 的全部复杂度，最终都收敛到一个 `while (await this.turn())` 循环里。

## 一、起点：终端里的一次回车

你在交互模式敲下提示词，真正的循环在 `packages/coding-agent/src/modes/interactive/interactive-mode.ts:1094`：

```ts
while (true) {
  const input = await this.getUserInput();   // 等用户输入
  await this.session.prompt(input);           // 交给会话驱动
}
```

`session` 是 `AgentSession`（`agent-session.ts:305`），它的 `prompt()` 方法（`agent-session.ts:1116`）是产品层的"主驱动"：它处理扩展命令、input 事件、skill/模板展开，然后**唤醒**来自 `pi-agent-core` 的 `Agent` 实例。

关键认知：**`AgentSession` 是"产品包装"，`Agent` 才是"运行时核心"**。`AgentSession` 把 CLI 的世界（扩展、配置、TUI 事件）翻译成 `Agent` 能懂的输入，再调 `Agent` 跑循环。这就是第 01 讲说的"分层清洁"——`Agent` 根本不知道自己被谁调用。

## 二、唤醒：从 prompt 到 runWithLifecycle

`Agent.prompt()` 最终进入 `packages/agent/src/agent.ts:486` 的 `runWithLifecycle()`，它负责把一次用户请求变成一串"事件"，并交给 `processEvents()`（`agent.ts:544`）消费。而真正让"轮子转起来"的，是 `agent-loop.ts` 里的 `runLoop`。

`runLoop` 出人意料地是**双层 while**（骨架在 `agent-loop.ts:155`）：

```ts
export async function runLoop(...) {
  // 外层：drain 后续消息（follow-up / steering）
  while (true) {
    const claimed = await claimNextMessages(...)      // 领取本批输入
    if (!claimed) break
    // 内层：在当前这批消息上跑"工具调用 / 转向"步骤
    while (true) {
      const event = await streamAssistantResponse(...) // ① 向模型要回复
      if (event 不再是工具调用) break
      await executeToolCalls(event.toolCalls, ...)      // ② 派发工具
      // 工具结果回灌，进入内层下一轮
    }
  }
}
```

两个 while 的分工是整段设计的精髓：

- **外层 while**：处理"用户中途插入"或"上轮遗留的转向消息"。只要还有没消费的输入，就继续开新一轮。它回答的是"**什么时候该停下来**"——队列空了才停。
- **内层 while**：在**同一批输入**上反复"模型回复 → 执行工具 → 把结果喂回模型"。它回答的是"**一轮内部怎么自我迭代**"——直到模型不再要求调用工具（转为普通文本回复）才退出内层。

> **知识拓展：为什么是双层而不是一层？**
> 单层循环要同时操心"有没有新输入"和"本轮工具链是否结束"，两个条件纠缠在一起，容易写出既漏消息又死循环的 bug。pi 用"外层管输入边界、内层管工具链"把两个正交的关注点拆开：外层每转一圈就是一次清晰的"用户轮次边界"，内层每转一圈是一次"工具自省"。对应到日志，你会看到外层的 `turn/start` 和内层的 `step/start` 成对出现——这正是 dsh 第 13 讲里 `turn` 与 `step` 同款哲学的 pi 版本。

## 三、① 流式响应：消息格式怎么跨包映射

内层第一步 `streamAssistantResponse`（`agent-loop.ts:281`）负责把 `Agent` 的内部消息投喂给 `pi-ai` 的模型。这里有个跨包接缝：**pi-agent-core 的消息类型和 pi-ai 要求的类型不一样**，需要转换。

转换发生在 `harness/messages.ts:124` 的 `convertToLlm()`——它把 agent 的会话消息（带工具结果、系统提示片段）映射成 `pi-ai` 认识的 `AssistantMessage` / `ToolCall`（类型定义在 `ai/src/types.ts:415` 与 `:360`）。映射完，`ModelsImpl`（`ai/src/models.ts:254`）根据模型名 dispatch 到对应 `Provider<TApi>`（`models.ts:97`），后者发出真正的 HTTP 请求。

模型回复是**流式**的。`pi-ai` 把各家供应商的 SSE（Server-Sent Events）归一化成统一的 `AssistantMessageEvent`（`ai/src/types.ts:523`），通过 `EventStream`（`ai/src/utils/event-stream.ts:4`）一段段吐出；`lazyStream`（`ai/src/api/lazy.ts:46`）负责按需惰性拉取。这些碎片在 `runLoop` 内层被实时拼回完整消息——这也是 TUI 能"边想边显示"的原因。

## 四、② 工具派发：executeToolCalls

当流式响应里出现工具调用，`runLoop` 调 `executeToolCalls`（`agent-loop.ts:411`）。pi 支持两种执行策略：

- **顺序执行**：`agent-loop.ts:433`，一个接一个跑（工具间有依赖时必需）；
- **并发执行**：`agent-loop.ts:489`，独立工具并行跑（提升速度）。

每个工具调用在真正执行前都经过 `prepareToolCall`（`agent-loop.ts:607`）——准备参数、绑定运行时环境。工具结果（成功/失败、输出文本）被回灌进内层 while，作为新的"用户消息"交给模型，模型据此决定下一步是继续调用工具，还是给出最终自然语言回复。

注意：工具**本身**在哪里定义、有哪些内置工具，是本系列卷四的主题（第 19–20 讲）。这一讲你只需记住生命线：**工具结果是内层循环的自我燃料**。

## 五、TUI 怎么"隔岸观火"地把这一切画出来

最反直觉的一点：终端屏幕的实时更新，**不来自 agent 主动通知 UI**，而是反过来——UI 订阅 agent 的事件流。

在 `interactive-mode.ts:3062`：

```ts
private subscribeToAgent(): void {
  this.unsubscribe = this.session.subscribe(async (event) => {
    await this.handleEvent(event);     // 事件 → 组件，与 agent 解耦
  });
}
```

`handleEvent`（`interactive-mode.ts:3068`）是一个巨大的 switch：`message_start` 时 new 一个 `AssistantMessageComponent` 并 `addChild` 到聊天容器（`:3133-3144`）；`message_update` 且内容含 `toolCall` 时创建 `ToolExecutionComponent`（`:3156`）；每个分支末尾只做一件事——调 `this.ui.requestRender()`。

**agent 完全不知道屏幕存在；它只管吐事件。屏幕怎么变，由 tui 的差分渲染器自己算（第 29 讲）。** 这正是第 01 讲"tui 是零 pi 依赖通用库"的运行时印证：coding-agent 把"事件→组件状态→请求渲染"这三步写在应用层，tui 库本身对 `AssistantMessageEvent` 一无所知。

## 试一试

在 `packages/agent/src/agent-loop.ts` 里定位 `runLoop`（`agent-loop.ts:155`）。回答两个问题：

1. 外层 while 的退出条件是什么？（提示：找 `claimNextMessages` 返回 falsy 的分支。）这说明"用户轮次"何时算结束？
2. 内层 while 的退出条件是什么？（提示：找 `streamAssistantResponse` 返回值里"不再是工具调用"的判断。）这说明"一轮内的工具自省"何时收敛？

想通这两点，你就掌握了 pi 心脏跳动的节拍。

## 下一讲预告

生命线走完了，但有一个问题悬而未决：pi 凭什么能"装了不同扩展就变成不同产品"？下一讲我们进设计哲学——`ExtensionAPI` 到底开放了哪八类能力、扩展怎么被加载、以及为什么 pi 敢于"没有内置权限系统"而把信任交给进程分离。
