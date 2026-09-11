---
title: "39 · status-indicator.ts — Working / Retry / Compaction 转圈"
summary: "不订 session。基类 Loader 用 timer 向 TUI requestRender。RetryStatusIndicator 另有 CountdownTimer 每秒改文案。InteractiveMode 在对应 end "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/status-indicator.ts`  
谁创建：InteractiveMode `showStatusIndicator` / `showWorkingStatusIndicator`。

## 订阅什么

不订 session。基类 `Loader` 用 timer 向 TUI `requestRender`。`RetryStatusIndicator` 另有 `CountdownTimer` 每秒改文案。InteractiveMode 在对应 `*_end` 事件 `dispose()`。

## 画什么

| 类 | kind | 文案 |
|---|---|---|
| WorkingStatusIndicator | working | 默认 "Working"，扩展可改 |
| RetryStatusIndicator | retry | `Retrying (i/n) in Xs... (Esc to cancel)` |
| CompactionStatusIndicator | compaction | manual / overflow / auto 三种前缀 |
| BranchSummaryStatusIndicator | branchSummary | Summarizing branch... |
| IdleStatus | （独立 Component） | 两行空白，占位用 |

`renderInBorder` / `renderSpinnerInBorder` 给 CustomEditor 顶边框用：去掉 Loader 的左右空白，按宽度截断。

## 失败与边界

- 同时只该有一个 active indicator。InteractiveMode 用 kind 匹配清除。
- `IdleStatus` 不是 Loader，没有 timer。

## 下一课

[40-countdown-timer.ts.md](/series/pi-source/coding-agent/534-countdown-timer-ts/)
