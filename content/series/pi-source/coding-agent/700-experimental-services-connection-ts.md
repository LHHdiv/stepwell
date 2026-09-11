---
title: "139 · services/connection.ts — 客户端绑定远端服务"
summary: "createServerServiceSource(client) / createSessionServiceSource(client)：chord RemoteServiceSource + 复制状态。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/connection.ts`

`createServerServiceSource(client)` / `createSessionServiceSource(client)`：chord `RemoteServiceSource` + 复制状态。

`ServerConnectionState`：connecting/connected/disconnected（带 retryAt）。`SessionAttachmentState`：detached/attaching/attached/degraded。`whenAttached` 等当前 generation hydrate 完，避免 prompt 打到空 session。`RoutedServiceBinding` 在 attach 前不把 call 发出去。

onError 回调给 TUI 黄字。

## 下一课

[140-experimental.services.sessions.ts.md](/series/pi-source/coding-agent/701-experimental-services-sessions-ts/)
