---
title: "40 · countdown-timer.ts — 对话框倒计时"
summary: "无 Agent 事件。setInterval(1000) 调 onTick(seconds) 和 tui.requestRender()；到 0 调 onExpire 后 dispose。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/countdown-timer.ts`  
谁创建：`RetryStatusIndicator`、扩展 select/input 的 timeout、`ExtensionSelectorComponent`。

## 订阅什么

无 Agent 事件。`setInterval(1000)` 调 `onTick(seconds)` 和 `tui.requestRender()`；到 0 调 `onExpire` 后 `dispose`。

## 画什么

自己不画。调用方把秒数写进标题，例如 `Pick one (5s)`。

## 失败与边界

- `tui` 可 undefined（无 TUI 的测试）。仍会 expire。
- 必须在组件拆掉时 `dispose`，否则 interval 漏到退出之后。

## 下一课

[41-dynamic-border.ts.md](/series/pi-source/coding-agent/536-dynamic-border-ts/)
