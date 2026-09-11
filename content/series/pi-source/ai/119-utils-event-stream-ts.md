---
title: "58 · utils/event-stream.ts — Agent 在 `for await` 的那头"
summary: "看懂生产者 push / end 和消费者 async iterator 如何用两个 FIFO 对接：事件已到则入队，消费者已在等则直接唤醒。result() 是「最终 AssistantMessage」的 Promise，comple"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/event-stream.ts`  
被谁调用：每个 `stream()` 的返回值；`lazyStream` 的 outer；agent-loop 的 `for await (const event of response)`。

## 本课目标

看懂生产者 `push` / `end` 和消费者 async iterator 如何用两个 FIFO 对接：事件已到则入队，消费者已在等则直接唤醒。`result()` 是「最终 AssistantMessage」的 Promise，`completeSimple` 只 await 它。

## `EventStream<T, R>`

构造：`isComplete(event)`、`extractResult(event)`。`AssistantMessageEventStream` 规定 complete = `done|error`，结果分别是 `message` / `error`。

`push`：已 `done` 则丢弃（防重复终端）。complete 事件会 `resolveFinalResult`。若有 waiting 消费者，直接交出；否则 enqueue。

`end(result?)`：标记结束，可选再 resolve result（lazyStream forward 时内层已 complete，这里 result 可能重复 resolve——Promise 只认第一次）。叫醒所有 waiter 并 `done: true`。

迭代器：队列有货就 yield；已结束就 return；否则把自己的 resolve 推进 waiting 队列。

`FifoQueue`：两个栈模拟队列，均摊 O(1)。

## 失败与边界

complete 事件不是 `done|error`：extractResult throw，这是实现 bug。只 `end()` 不 push 终端：iterator 结束，但 `result()` 永远 pending——`completeSimple` 会挂住。各 stream 的 catch 必须 `push(error)+end`。`partial` 可变：消费者不能假设 yield 后对象冻结。

`createAssistantMessageEventStream()` 给扩展用，等价 `new`。

## 下一课

把事件压成可持久化帧：[59-utils-assistant-message-frame.ts.md](/series/pi-source/ai/120-utils-assistant-message-frame-ts/)。
