---
title: "130 · experimental/client-tui-chat.ts — 快照驱动的聊天视图"
summary: "ExperimentalChatView.apply(LaneSnapshot)：按 transcript entry id 差量重建，不订 AgentSession。流式助手用同一个 AssistantMessageComponent"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/client-tui-chat.ts`

`ExperimentalChatView.apply(LaneSnapshot)`：按 `transcript` entry id 差量重建，不订 AgentSession。流式助手用同一个 `AssistantMessageComponent`；runningTools 用 `ToolExecutionComponent` + `createAllToolRenderers()`。pending/status 容器给队列和 Working 转圈。

这是「服务端有状态、客户端是投影」的画法。InteractiveMode 是事件增量；这里是每次快照对齐，丢事件也不容易画歪。

## 下一课

[131-experimental.client-tui.ts.md](/series/pi-source/coding-agent/692-experimental-client-tui-ts/)
