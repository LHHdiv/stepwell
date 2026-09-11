---
title: "49 · custom-entry.ts — 会话 JSONL 里的 custom entry"
summary: "无。和 CustomMessage 类似，但数据是 SessionEntry 不是 AgentMessage。走 EntryRenderer，不是 MessageRenderer。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/custom-entry.ts`  
谁创建：`entry_appended` type=custom；历史 `renderSessionEntries`。

## 订阅什么

无。和 CustomMessage 类似，但数据是 `SessionEntry` 不是 AgentMessage。走 `EntryRenderer`，不是 `MessageRenderer`。

## 画什么

`renderer(entry, { expanded }, theme)`。host 在组件外包一层 Spacer；渲染器只输出内容。失败：紫底错误 Box。渲染器返回 undefined 则 `hasContent()` 为 false，InteractiveMode 可选择不挂。

## 失败与边界

custom entry 和 custom message 是两套扩展 API。搞混 type 会找不到 renderer。

## 下一课

[50-compaction-summary-message.ts.md](/series/pi-source/coding-agent/554-compaction-summary-message-ts/)
