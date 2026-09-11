---
title: "14 · events.ts — 被动事件总线，监听器失败不得炸 drive"
summary: "对比 Agent.subscribe：那边 await 每个监听器，写盘慢会挡住下一事件（刻意）。这边是 harness 的 UI/遥测总线：事件先 structuredClone，监听器失败变成 handlererror，不回滚已经 "
tags: [pi, agent]
---
源码：`packages/agent/src/harness/events.ts`  
被谁调用：`Harness` 构造 `new HarnessEventBus()`；lane 经 `emitBatch` 发事件；`watch()` 走 `installWatcher`。

## 本课目标

对比 `Agent.subscribe`：那边 **await 每个监听器，写盘慢会挡住下一事件**（刻意）。这边是 harness 的 UI/遥测总线：事件先 `structuredClone`，监听器失败变成 `handler_error`，**不回滚已经 commit 的事务**。

## `HarnessEventBus`

`on(type, listener)` 返回取消函数。close 之后 `on` throw。

`emitBatch`：对每条事件 snapshot 当时的 recipients（该 type 的 listeners + 全部 watchListeners），clone payload，串到全局 `deliveryTail`。后一次 emit 等前一次 deliver 完。单个 listener throw → 合成 `handler_error` 再 deliver，且 `reportErrors: false` 防止递归。

`watch` / `watchFromSnapshot`：装 `BufferedEventWatcher`。filter 决定这个 watch 要哪些事件。`watchFromSnapshot` 先 capture 快照再返回 handle，失败则 unsubscribe。

## `BufferedEventWatcher`

状态：`buffering` → `started` → `unsubscribed`。`start(listener)` 只能一次：先把缓冲事件按序交给 listener。

`resnapshot` 的边界协议（避免丢事件、也不重放旧时代）：

1. `epoch++`，phase=`dropping`：这期间到来的事件丢掉（即将被新快照覆盖）。
2. capture 回调必须调用 `markBoundary()`：把 phase 改成 `holding`，之后事件暂存。
3. capture 返回后等 `reached`，写入 `snapshot`，再把 held 事件 push 出去。

capture 若不 mark，bus 会 throw `"Resnapshot capture did not mark its boundary"`。lane.watch 在 `readLane` 里 capture 完立刻 mark，保证快照与随后事件之间没有未观测的 commit。

`navigation_end` 时 reducer 返回 `"rebase"`（课 61），因为 tip 跳到另一条祖先路径，不能只 append。watch 侧靠 resnapshot 拿完整 transcript。

## 失败与边界

- 监听器慢：只慢事件投递，不慢 `mutator.commit`。和 Agent.subscribe 相反。
- `handler_error` 自己的 listener 再 throw：忽略。
- close 后 `deliveryTail.finally` 清空 listeners。已发出的 in-flight deliver 仍可能跑完。

## 下一课

[15 · hooks.ts](/series/pi-source/agent/256-harness-hooks-ts/)：钩子是另一条总线，失败策略按钩子名不同。
