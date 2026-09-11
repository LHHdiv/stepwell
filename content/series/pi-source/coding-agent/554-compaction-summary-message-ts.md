---
title: "50 · compaction-summary-message.ts — 压缩摘要气泡"
summary: "无。setExpanded 来自全局 app.tools.expand（InteractiveMode 对 Expandable 一齐切）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/compaction-summary-message.ts`  
谁创建：`compaction_end` 成功后 `createCompactionSummaryMessage`；历史重放。

## 订阅什么

无。`setExpanded` 来自全局 `app.tools.expand`（InteractiveMode 对 Expandable 一齐切）。

## 画什么

紫底 Box，标签 `[compaction]`。折叠：一行 `Compacted from N tokens (Ctrl+O to expand)`；展开：Markdown 全文摘要。

## 失败与边界

摘要是模型产出的 Markdown，可能很长。折叠默认避免刷屏。

## 下一课

[51-branch-summary-message.ts.md](/series/pi-source/coding-agent/556-branch-summary-message-ts/)
