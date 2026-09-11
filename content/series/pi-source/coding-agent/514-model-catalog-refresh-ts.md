---
title: "30 · model-catalog-refresh.ts — 合并并发的目录刷新"
summary: "同一 ModelRuntime 上同时点开选择器和启动刷新时，不要打两遍网络。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/model-catalog-refresh.ts`  
被谁调用：`InteractiveMode.run` 后台刷新；`ModelSelectorComponent` 打开时再刷一次。

## 本课目标

同一 `ModelRuntime` 上同时点开选择器和启动刷新时，不要打两遍网络。

## `ModelCatalogRefreshCoordinator`

`WeakMap<runtime, { controller, promise, waiters }>`。第一次 `refresh(runtime, signal)` 真正调用 `modelRuntime.refresh`，后续 waiter +1，都 `raceWithAbortSignal` 等同一 promise。最后一个 waiter 结束才 `controller.abort()` 并删 map 条目。

调用方自己的 `signal` abort 只让**自己**的 Promise reject，不拆掉共享刷新——除非已经没人等了。

## 失败与边界

- 共享 abort 会让 `modelRuntime.refresh` 看到 abort。最后一个离开的人取消飞行中的请求，这是有意的。
- WeakMap 以 runtime 对象为键，换会话换了 ModelRuntime 就是另一次刷新。

## 下一课

[31-session-share.ts.md](/series/pi-source/coding-agent/516-session-share-ts/)
