---
title: "65 · utils/abort.ts — 可选 signal 与 abort race"
summary: "operationSignal(signal?)：没传就 new AbortController().signal（永不断开的活 signal）。后续代码可以无脑 signal.throwIfAborted()，不必每次判断 optio"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/abort.ts`  
被谁调用：`Models` 所有公共异步方法；`resolveProviderAuth`。

## 函数

`operationSignal(signal?)`：没传就 `new AbortController().signal`（永不断开的活 signal）。后续代码可以无脑 `signal.throwIfAborted()`，不必每次判断 optional。

`raceWithAbortSignal(operation, signal)`：abort 时立刻 reject，但 `operation.catch(() => {})` 继续观察，避免未处理 rejection。已 aborted 时同样 detach。reject 的 reason 用 `signal.reason`，没有则造 `AbortError`。

credential store 的 enqueue 用它：调用方 abort 了，队列里的任务可能仍跑（见 44 课）。

## 失败与边界

永不 abort 的 fallback signal 会泄漏一个 AbortController（很小）。`race` 在 operation 成功和 abort 同时：`settled` 标志保证只结算一次，谁先谁赢。

## 下一课

合并多个 AbortSignal：[66-utils-abort-signals.ts.md](/series/pi-source/ai/127-utils-abort-signals-ts/)。
