---
title: "129 · experimental/client.ts — 无 TUI 的实验客户端"
summary: "runClient：发现 → 无 session 且无 prompt 则 list；有 prompt 无 session 则在唯一 server 上 management.create；有 sessionId 则 attach（Radi"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/client.ts`

`runClient`：发现 → 无 session 且无 prompt 则 list；有 prompt 无 session 则在唯一 server 上 `management.create`；有 sessionId 则 attach（Radius 找不到就报错，本地唯一 server 可 create 指定 id）。`plugins.prepareSession` 之后 `agent.prompt`。transcript 订阅把 `message_update` 交给 `onEvent`，`message_end` 记下该 run 的文本。

和 print-mode 类似：prompt 完取助手文本。事件模型是 `LaneWatchEvent`（harness），不是 `AgentSessionEvent`。

## 下一课

[130-experimental.client-tui-chat.ts.md](/series/pi-source/coding-agent/691-experimental-client-tui-chat-ts/)
