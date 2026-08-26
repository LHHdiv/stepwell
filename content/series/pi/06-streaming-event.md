---
title: 第06讲·流式归一：AssistantMessageEvent 与 EventStream
summary: 看 pi 如何把各家供应商的 SSE 流，归一化成统一的 AssistantMessageEvent，并通过 EventStream 增量投递。
objectives:
  - 列出 AssistantMessageEvent 判别联合的主要变体及其携带的 partial 快照
  - 说明 EventStream 作为通用"生产者-消费者"异步队列的工作机制
  - 解释 lazyStream 为何能先同步返回流、背后再做认证与模块加载
keyPoints:
  - AssistantMessageEvent 是判别联合，承载 start/text/thinking/toolcall/done/error 等事件，types.ts:523
  - "每个流式事件都带 partial: AssistantMessage 快照，使增量渲染成为可能"
  - EventStream<T,R> 是通用异步队列，push 入队、async iterator 出队、result 取终值，event-stream.ts:4
  - AssistantMessageEventStream 固定"以 done/error 收尾、提炼出 AssistantMessage"，event-stream.ts:69
  - lazyStream 同步返回外层流，背后异步做鉴权与懒加载，失败转 error 事件，api/lazy.ts:46
tags: [pi, pi-ai, 流式, 事件]
---

想象你看直播：主播不会先把整场视频录完再发给你，而是边拍边传。大模型回复也是一样——它一边"想"一边往外吐字。但麻烦在于，Anthropic 吐的是 `content_block_delta`、OpenAI 吐的是 `choices[].delta`、Google 又是另一套。如果 `pi-ai` 把这套差异直接丢给上层，第 02 讲的 TUI 就得为每家供应商写一套渲染逻辑。

pi 的解法是：**所有供应商的差异在 `pi-ai` 内部被吃掉，对外只暴露一种事件——`AssistantMessageEvent`**。本讲我们看这个归一化是怎么落地的。

## 一、结论：多供应商 SSE → 单一 AssistantMessageEvent 流

`AssistantMessageEvent` 是一个判别联合（`types.ts:523`），它把"一次模型回复"拆解成一条**有顺序的事件流**：

```ts
export type AssistantMessageEvent =
  | { type: "start"; partial: AssistantMessage }
  | { type: "text_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "text_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "text_end"; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: "thinking_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "thinking_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "thinking_end"; contentIndex: number; content: string; partial: AssistantMessage }
  | { type: "toolcall_start"; contentIndex: number; partial: AssistantMessage }
  | { type: "toolcall_delta"; contentIndex: number; delta: string; partial: AssistantMessage }
  | { type: "toolcall_end"; contentIndex: number; toolCall: ToolCall; partial: AssistantMessage }
  | { type: "done"; reason: Extract<StopReason, "stop" | "length" | "toolUse" | "deferred">; message: AssistantMessage }
  | { type: "error"; reason: Extract<StopReason, "aborted" | "error">; error: AssistantMessage };
```

逐行拆解：

- 事件以 `type` 判别：`start` 开场，中间是成对的 `*_start` / `*_delta` / `*_end`（文本、思考、工具调用各一套），最后以 `done` 或 `error` 收尾。这正是第 02 讲 TUI 的 `handleEvent` 里 `message_start` / `message_update` 分支能直接映射的底层来源。
- `contentIndex` 指明这次增量落在 `AssistantMessage.content` 数组的**第几个元素**上——文本块、思考块、工具调用块在数组里各有位置，增量必须知道往哪贴。
- 最关键的字段是几乎每个事件都带的 **`partial: AssistantMessage`**：它是到当前时刻为止的"半成品消息"。消费者（TUI、或第 02 讲的 `runLoop`）不需要自己拼装，每次直接拿这个快照渲染即可。
- `done` 携带完整 `message`，`error` 携带带 `stopReason: "error"` 的 `message`。二者都是终态，后面不再有事件。

为什么不直接给"完整消息 + 进度回调"？因为 `partial` 快照让**任意中间状态都可独立渲染、可序列化、可落盘**。第 02 讲里 TUI 只管订阅事件流、每次 `requestRender()`，它根本不关心供应商是谁——这正是归一化的红利。

## 二、EventStream：一个通用的"生产者-消费者"异步队列

事件流不是随便一个数组，而是一个能在"生产者边产生、消费者边消费"之间解耦的结构。`EventStream` 类定义在 `event-stream.ts:4`：

```ts
export class EventStream<T, R = T> implements AsyncIterable<T> {
  private queue: T[] = [];                              // 已产生、尚无人取的缓冲
  private waiting: ((value: IteratorResult<T>) => void)[] = [];  // 排队等事件的消费者
  private done = false;
  private finalResultPromise: Promise<R>;              // 终值（如完整 AssistantMessage）
  private isComplete: (event: T) => boolean;          // 判断事件是否终态
  private extractResult: (event: T) => R;             // 从终态事件提炼终值

  constructor(isComplete: (event: T) => boolean, extractResult: (event: T) => R) { /* … */ }

  push(event: T): void {                               // 生产者投递一个事件
    if (this.done) return;
    if (this.isComplete(event)) {                      // 遇到终态：记下终值并关闭
      this.done = true;
      this.resolveFinalResult(this.extractResult(event));
    }
    const waiter = this.waiting.shift();               // 有等着的消费者就直接交给他
    if (waiter) waiter({ value: event, done: false });
    else this.queue.push(event);                       // 否则入缓冲队列
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {  /* 出队逻辑 */ }
  result(): Promise<R> { return this.finalResultPromise; }  // 取终值
}
```

逐行看机制：

- 构造时传入两个函数：`isComplete` 判断某个事件是不是终点（对 `AssistantMessageEventStream` 来说就是 `type === "done" || type === "error"`）；`extractResult` 从终点事件里提炼最终返回值。
- `push` 是生产者侧入口。它先判终态：是终态就 resolve 掉 `finalResultPromise` 并 `done = true`；否则把事件交给一个正在 `await` 的消费者，没有消费者就塞进 `queue` 缓冲。
- `async *[Symbol.asyncIterator]` 是消费者侧：`for await (const ev of stream)` 会依次拿到事件；队列空了但还没 `done`，就挂起等下一个 `push`；`done` 后正常结束。
- `result()` 返回**终值 Promise**。注意它和"逐事件迭代"是两条独立的获取路径：你可以一边 `for await` 拿细节，一边 `await stream.result()` 拿最终 `AssistantMessage`。

这个设计的精髓是**背压与解耦**：生产者（供应商 HTTP 流）和消费者（TUI / runLoop）互不知道对方节奏。生产快了就缓冲，消费快了就挂起等——这正是流式系统该有的样子。

## 三、AssistantMessageEventStream + lazyStream：先把流返回，背后再做苦活

`pi-ai` 给 `AssistantMessageEvent` 准备了一个特化子类（`event-stream.ts:69`）：

```ts
export class AssistantMessageEventStream extends EventStream<AssistantMessageEvent, AssistantMessage> {
  constructor() {
    super(
      (event) => event.type === "done" || event.type === "error",   // 终态判定
      (event) => {
        if (event.type === "done") return event.message;            // 提炼完整消息
        if (event.type === "error") return event.error;
        throw new Error("Unexpected event type for final result");
      },
    );
  }
}
```

它把"以 `done`/`error` 收尾、提炼出 `AssistantMessage`"这套规则**固化**下来，供应商代码只要往里 `push` 事件即可，不必每次重复终态逻辑。

更巧妙的是 `lazyStream`（`api/lazy.ts:46`）——它解决一个时序悖论：**调用方要立刻拿到一个流对象（否则上层无法开始 `for await`），但真正的流要等异步鉴权、懒加载模块之后才存在**。

```ts
export function lazyStream(
  model: Model<Api>,
  setup: () => Promise<AsyncIterable<AssistantMessageEvent>>,
): AssistantMessageEventStream {
  const outer = new AssistantMessageEventStream();      // 立刻返回一个"空壳"流

  setup()                                                // 背后异步做鉴权/加载
    .then((inner) => forwardStream(outer, inner))         // 就绪后把内部事件转发进空壳
    .catch((error) => {
      const message = createSetupErrorMessage(model, error);  // 失败也走正常协议
      outer.push({ type: "error", reason: "error", error: message });
      outer.end(message);
    });

  return outer;                                          // 同步返回，不阻塞调用方
}
```

逐行：

- 第 4 行先 `new` 一个外层流**立刻返回**——上层 `pi-ai` 的 `stream()` 调用因此无需 `await`，可以直接把流交给第 02 讲的 `runLoop`。
- 第 6 行 `setup()` 在背后跑：解析 API Key、动态 `import()` 供应商实现模块等。这些活儿可能失败（Key 没配、网络不通）。
- 成功时 `forwardStream` 把内部真实事件逐个 `push` 进外层流；失败时不是抛异常，而是**往流里推一个 `error` 事件**（第 9–11 行）——这样消费者走的是同一条"错误也是正常终态"的路径，无需特殊 try/catch。

> **知识拓展：为什么"懒"这么重要？**
> 第 02 讲的 `runLoop` 在内层 `while` 里每轮都调 `streamAssistantResponse`。如果每次都要先 `await` 完鉴权与模块加载才能拿到流，整条生命线就会被"准备动作"拖慢首字延迟。`lazyStream` 把准备动作挪到流背后异步执行，用户几乎立刻看到第一个 `text_delta`——首字体验和代码简洁兼得。

## 试一试

打开 `packages/ai/src/utils/event-stream.ts`，定位 `EventStream`（`event-stream.ts:4`）。回答两个小问题：

1. `push` 方法里（`:21` 起）先判断 `isComplete`，再决定是交给 `waiting` 还是入 `queue`。如果生产者连续 `push` 了 5 个非终态事件、而此时还没有消费者订阅，这 5 个事件去了哪里？消费者后来 `for await` 时还能按顺序拿到吗？
2. `lazyStream`（`api/lazy.ts:46`）的 `.catch` 分支往流里推了 `type: "error"`。结合第 05 讲 `AssistantMessage` 的 `stopReason`，思考：为什么失败要伪装成"正常协议内的一次 error 事件"，而不是让 `lazyStream` 直接 `throw`？

## 下一讲预告

流归一化讲完了，但"谁在生产者那一侧把供应商的 SSE 翻译成 `AssistantMessageEvent`"还没揭晓。下一讲我们进 `Provider<TApi>` 抽象——看 `pi-ai` 如何用一套接口收口 Anthropic、OpenAI、Google 等所有供应商，以及 `ModelsImpl` 如何把 N 个 Provider 编排成统一门面。
