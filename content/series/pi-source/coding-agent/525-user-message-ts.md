---
title: "35 · user-message.ts — 用户气泡"
summary: "无 session 订阅。构造时传入最终文本，之后只有 setOutputPad 会 rebuild。换肤靠父容器 invalidate → Markdown 用当前 theme。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/user-message.ts`  
谁创建：`addMessageToChat` role=user，且不是 skill 块。

## 订阅什么

无 session 订阅。构造时传入最终文本，之后只有 `setOutputPad` 会 rebuild。换肤靠父容器 invalidate → Markdown 用当前 `theme`。

## 画什么

`Box` 底色 `userMessageBg`，文字 `userMessageText`。Markdown 打开 `preserveOrderedListMarkers` 和 `preserveBackslashEscapes`，避免用户输入的 `1.` 被重新编号。同样包 OSC 133 区段。

## 失败与边界

- 图片不在这个组件里。用户消息里的图片路径只是文本；真正的 Image 附件在 prompt 选项里，不回显为 kitty 图（除非将来加）。
- skill 调用走 `SkillInvocationMessageComponent`，本组件只画 skill 块后面那句人话。

## 下一课

[36-tool-execution.ts.md](/series/pi-source/coding-agent/527-tool-execution-ts/)
