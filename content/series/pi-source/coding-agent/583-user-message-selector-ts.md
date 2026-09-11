---
title: "64 · user-message-selector.ts — /fork 选一句用户话"
summary: "无 session。数据是调用方传入的 { id, text }[]（getUserMessagesForForking）。内部 UserMessageList 处理上下、确认、取消。外层 Container 加边框和说明。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/user-message-selector.ts`  
谁创建：`showUserMessageSelector`（`/fork` 或双 Esc）。

## 订阅什么

无 session。数据是调用方传入的 `{ id, text }[]`（`getUserMessagesForForking`）。内部 `UserMessageList` 处理上下、确认、取消。外层 Container 加边框和说明。

## 画什么

每条两行：`›` + 单行截断文本，下一行 `Message i of n`。默认选中最新。可视窗口约 10 条，带滚动提示。

## 失败与边界

确认只回 `entryId`。真正 fork、把文本填回编辑器是 InteractiveMode / runtimeHost 的事。空列表由调用方先挡。

## 下一课

[65-session-selector-search.ts.md](/series/pi-source/coding-agent/584-session-selector-search-ts/)
