---
title: "48 · custom-message.ts — 扩展自定义消息"
summary: "无。setExpanded / setOutputPad / invalidate 触发 rebuild。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/custom-message.ts`  
谁创建：`addMessageToChat` role=custom 且 `message.display`。

## 订阅什么

无。`setExpanded` / `setOutputPad` / `invalidate` 触发 rebuild。

## 画什么

优先 `extensionRunner.getMessageRenderer(customType)`。渲染器返回的 Component 自己负责颜色。失败或没有渲染器：紫底 `customMessageBg` 的 Box，标签 `[type]` + Markdown/文本。`expanded` 传给渲染器，内置折叠逻辑由扩展自己做。

## 失败与边界

渲染器 throw：Box 里红字 `renderer failed: ...`，不让整棵树炸。`display: false` 的 custom 消息根本不会进这个组件。

## 下一课

[49-custom-entry.ts.md](/series/pi-source/coding-agent/552-custom-entry-ts/)
