---
title: "89 · utils/abort.ts — 可选 AbortSignal"
summary: "operationSignal(signal?)：没传就 new AbortController().signal，让内部代码不必每次判断。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/abort.ts`

`operationSignal(signal?)`：没传就 `new AbortController().signal`，让内部代码不必每次判断。

`raceWithAbortSignal(promise, signal)`：signal abort 时立刻 reject，但 **继续观察** 原 promise（`.catch(()=>{})`），避免未处理 rejection。已 abort 则同样吞掉原操作的后续错误。reason 缺省时造 `AbortError`。

模型目录刷新的多 waiter 取消靠这个，不会把共享 fetch 的失败变成 unhandled。

## 下一课

[90-utils.sleep.ts.md](/series/pi-source/coding-agent/635-utils-sleep-ts/)
