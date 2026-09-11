---
title: "01 · agent.ts — Agent 对象：状态机外壳"
summary: "分清 Agent 不是循环本身。它是：一份状态 + 一套队列 + 订阅表 + 把 prompt 翻译成一次 runAgentLoop。循环在 agent-loop.ts。把两者混在一起，就看不懂「为什么正在跑的时候不能再 prompt」"
tags: [pi, agent]
---
源码：`packages/agent/src/agent.ts`  
被谁调用：coding-agent `sdk.ts` 里 `new Agent({...})`，然后 `AgentSession` 保存为 `this.agent`，`prompt` 最终 `this.agent.prompt(...)`。

## 本课目标

分清 Agent **不是**循环本身。它是：一份状态 + 一套队列 + 订阅表 + 把 `prompt` 翻译成一次 `runAgentLoop`。循环在 `agent-loop.ts`。把两者混在一起，就看不懂「为什么正在跑的时候不能再 prompt」。

## 在系统中的位置

```text
new Agent({ initialState, streamFn, convertToLlm, beforeToolCall, ... })
agent.subscribe(listener)     // AgentSession 用来写盘和转发给 UI
agent.prompt(userMessage)
  若 activeRun 已存在 → throw
  runWithLifecycle
    runAgentLoop(..., processEvents, streamFn)
```

## 构造函数

`options` 缺字段时用默认：`convertToLlm` 只保留 user/assistant/toolResult；`streamFn` 用 `getDefaultStreamFn()`（coding-agent 的 sdk 已设成 `streamSimple`）；`toolExecution` 默认 `"parallel"`；steer/followUp 队列默认 `"one-at-a-time"`。

状态用 `createMutableAgentState`：`tools` 和 `messages` 的 setter **拷贝顶层数组**。所以 `agent.state.messages = existing` 不会和外部数组共享引用。这是为了防止 Session 和循环同时 splice 同一份数组。

`sessionId`、`thinkingBudgets`、`transport`、`maxRetryDelayMs` 原样存着，循环时塞进 `AgentLoopConfig`，最终到 streamFn。Agent 不解释它们。

## `subscribe`

```ts
subscribe(listener: (event, signal) => void | Promise<void>): () => void
```

监听器按登记顺序 **await**。写盘的监听器如果慢，会挡住下一事件。这是刻意的：必须先把 `message_end` 落盘，再发下一条，崩溃才不会丢顺序。

返回取消函数。`AgentSession.dispose` 会取消。

注释强调：`agent_end` 是一轮的最后一个事件，但 Agent 要等所有监听器对这个事件的 Promise 都 settle 才算 idle。UI 若在 `agent_end` 里又 steer，时序会和「已经 idle」赛跑。coding-agent 用 `waitForIdle` 处理这个缝。

## `prompt` 三个重载

```ts
prompt(message: AgentMessage | AgentMessage[]): Promise<void>
prompt(input: string, images?: ImageContent[]): Promise<void>
```

字符串被 `normalizePromptInput` 收成一条 `{ role: "user", content: [text, ...images], timestamp }`。

**若 `this.activeRun` 已有值：立刻 throw。** 不会自动排队。排队必须显式 `steer` / `followUp`。这就是 AgentSession.prompt 在 `isStreaming` 时不调 `agent.prompt`、改走队列的原因。

然后 `runPromptMessages` → `runWithLifecycle` → `runAgentLoop`。

`continue()`：不增加新用户消息，从当前 transcript 接着跑（最后一条必须是 user 或 toolResult）。重试、压缩后恢复会用到。

## `steer` / `followUp`

- `steer`：当前助手回合结束后、决定是否再调模型之前注入。人话：「插一嘴」。
- `followUp`：整个 Agent 本将结束时才跑。人话：「做完这件事再做下一件」。

队列 mode `one-at-a-time` 一次只放出一条，避免用户连打三句被合成一轮。`all` 一次倒空。coding-agent 从设置读取。

循环通过 `getSteeringMessages` / `getFollowUpMessages` 来拉队列。见下一课 `runLoop` 里对这两个回调的调用点。

## `runWithLifecycle`

私有。创建 `AbortController` 存进 `activeRun`，执行传入的 executor，在 `finally` 清 `activeRun`。`abort()` 调 `controller.abort()`，循环和 streamFn 的 signal 被掐断，`stopReason` 变成 `aborted`。

同一时刻只能有一个 activeRun，这是 Agent 层的互斥锁。更高层的并行（多会话）要多个 Agent 实例。

## `processEvents`

把 loop 的 `AgentEvent` 分发给订阅者，并更新 `_state`（`isStreaming`、`streamingMessage`、`pendingToolCalls`）。UI 读 `agent.state.isStreaming` 画加载中，不自己猜。

## 失败与边界

- 重复 prompt：throw，不入队
- continue 时最后一条是 assistant 且队列空：throw
- streamFn 抛错：由 loop 收成 assistant error 消息，仍会 `agent_end`
- 监听器抛错：会让这一轮的 lifecycle Promise reject，activeRun 仍会在 finally 清掉

## 下一课

循环本体：[02-agent-loop.ts.md](/series/pi-source/agent/243-agent-loop-ts/)。打开时同时开着 `src/types.ts` 里的 `AgentEvent` 联合类型，对照 `event.type`。
