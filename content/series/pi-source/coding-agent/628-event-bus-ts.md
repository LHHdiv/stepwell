---
title: "87 · event-bus.ts — 扩展用的字符串通道"
summary: "薄封装 EventEmitter。on 返回 unsubscribe。handler 异步错误 console.error，不抛向 emit 方。clear 给 reload。ResourceLoader 与 ExtensionRunt"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/event-bus.ts`

薄封装 `EventEmitter`。`on` 返回 unsubscribe。handler 异步错误 `console.error`，不抛向 emit 方。`clear` 给 reload。ResourceLoader 与 ExtensionRuntime 共享，扩展之间可 `eventBus.emit("my-channel")`。不是 Agent 的 typed 事件（那是 runner.emitXxx）。

## 下一课

[88-exec.ts.md](/series/pi-source/coding-agent/630-exec-ts/)。
