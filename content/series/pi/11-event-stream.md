---
title: 第11讲·EventStream：自研流式基石
summary: 精读 event-stream.ts：队列+等待者+最终结果的极简异步流实现——几十行代码的教科书。
objectives:
  - 理解 EventStream 的三要素：队列、等待者、结果 Promise
  - 体会 AsyncIterable 接口如何统一"推"与"拉"
  - 对照 dsh 的流处理，体会两种抽象的取舍
tags: [pi, pi-ai, 异步流]
keyPoints:
  - EventStream<T, R> 实现 AsyncIterable<T>，R 是最终结果
  - 推模式（push 事件）和拉模式（for await 消费）通过 waiter 队列衔接
  - 不依赖 RxJS/SSE 库——零依赖的流原语
---

流式是智能体体验的命脉。pi 没有引入 RxJS 或任何 SSE 库，而是自研了一个极简的事件流：`packages/ai/src/utils/event-stream.ts`，第一行就亮明身份：

```ts
export class EventStream<T, R> implements AsyncIterable<T>
```

两个泛型：`T` 是流中事件的类型（比如 text_delta 碎片），`R` 是**最终结果**的类型（比如拼好的完整 AssistantMessage）。流会结束，结束时给你一个总账。

## 三要素

**队列（queue）**：生产者 push 进来的事件先排队。
**等待者（waiters）**：消费者 `for await` 时，如果队列空了，就把"继续迭代的回调"挂进等待者列表睡觉。
**结果 Promise**：流结束时 resolve 的那个 Promise，`for await` 循环结束后可以拿到 `R`。

消费端体验极其自然：

```ts
for await (const event of stream) {
  if (event.type === "text_delta") process.stdout.write(event.delta);
}
const final = await stream.result;   // 流结束后的完整消息
```

**生产者只管 push，消费者只管迭代，中间的唤醒/挂起全部由 waiter 机制协调**——这就是异步迭代器协议的精髓。几十行代码实现了 RxJS 百分之十的功能，而这百分之十覆盖了智能体场景百分之百的需求。

## 事件从哪来

协议适配器（`src/api/openai-completions.ts` 第 201 行的 `stream` 函数）创建 `AssistantMessageEventStream`，然后：发起 fetch → 拿到 SSE 字节流 → `parseStreamingJson` 增量解析 → 每解析出一个 delta 就 push 一个事件（`text_delta`/`thinking_delta`/`tool_call_delta`…）→ 流结束 push `done` 或 `error`。

事件类型清单在 types.ts 第 523 行的 `AssistantMessageEvent` 联合——对照 dsh 的 StreamChunk（第 11 讲），两边词汇高度相似：都有文本增量、思考增量、工具调用增量、结束原因。**英雄所见略同**。

## 为什么不用现成库

三个理由：依赖洁癖（pi 追求可审计的最小依赖）、控制力（错误处理/背压策略自己说了算）、教学价值（你现在读懂了它，以后遇到任何流式问题都有手感）。这也是 pi"紧凑库式"哲学的缩影：**每个抽象都小到能一眼看穿**。

## 试一试

通读 event-stream.ts（真的不长）。找到 push 方法和迭代器的 next 方法，画出"生产者 push 时如果没人消费会发生什么"的数据路径。这个问题想通了，你就真正掌握了异步迭代器。

## 下一讲预告
看一个最小的真实供应商：DeepSeek 适配器——全文只有 14 行，却是理解"协议×供应商"双维度设计的最佳样本。
