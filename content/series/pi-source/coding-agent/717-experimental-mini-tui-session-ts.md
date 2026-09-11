---
title: "156 · mini/tui/session.ts — presentation 上的会话投影"
summary: "connect(transport, sessionId|null, cwd)：一个 peer，use(Lane) 和 use(Models)。presentationId UUID。lane.watch(id) 拿到 snapshot"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/tui/session.ts`

`connect(transport, sessionId|null, cwd)`：一个 peer，`use(Lane)` 和 `use(Models)`。`presentationId` UUID。`lane.watch(id)` 拿到 snapshot，本地用 `reduceLaneSnapshot` 折后续 `LaneEvent`。`start(subscriptionId)` 才开始收缓冲事件——所以 TUI 永远先有快照再有 delta。

attach 超时 60s（可能要 spawn worker）。`subscribe` 只通知「state 变了」，view 自己 `state()`。

## 下一课

[157-experimental.mini.tui.view.ts.md](/series/pi-source/coding-agent/718-experimental-mini-tui-view-ts/)
