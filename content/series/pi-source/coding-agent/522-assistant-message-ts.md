---
title: "34 · assistant-message.ts — 助手气泡"
summary: "不直接订 session。InteractiveMode 在 messageupdate / messageend 调 updateContent(message, isStreaming)。左键点 thinking 块在组件内 Mou"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/assistant-message.ts`  
谁创建：`handleEvent("message_start")` 流式新建；`addMessageToChat` 重放历史。

## 订阅什么

不直接订 session。InteractiveMode 在 `message_update` / `message_end` 调 `updateContent(message, isStreaming)`。左键点 thinking 块在组件内 `MouseRegion` 切换该 run 的显隐。`invalidate()`（换肤）会用 `lastMessage` 重画。

## 画什么

- 文本块：`Markdown`，theme 的 markdown 色，经 `createMarkdownTransform("assistant", streaming, transformers)`（含 mermaid）。
- thinking 块：连续 thinking 合成一段。隐藏时只一行斜体 `Thinking...`（可被扩展改 label）；展开时斜体 thinkingText。点击翻转。
- 流式/失败：`stopReason` 为 error/aborted/length 时在末尾加红字。工具调用本身不在这里画，避免和 `ToolExecutionComponent` 重复。
- 无工具调用时给首尾行包 OSC 133 A/B/C，给 shell 集成标「一块完整输出」。

padding 用 `outputPad`。工具调用前后不加多余 Spacer，避免和工具组件之间空两行。

## 失败与边界

- `hasToolCalls` 时不包 OSC 133，因为工具组件会把「一块输出」切开。
- 流式 Markdown 每次 update 整段重 parse，靠 tui Markdown 自己的缓存。

## 下一课

[35-user-message.ts.md](/series/pi-source/coding-agent/525-user-message-ts/)
