---
title: "153 · mini/shared/rpc.ts — 透明转发的 JSON RPC"
summary: "帧：call/result/error/cancel/event/announce/ping。createPeer(connection, { forward, deadMs })。本 peer 不提供的 service.method "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/shared/rpc.ts`

帧：call/result/error/cancel/event/announce/ping。`createPeer(connection, { forward, deadMs })`。本 peer 不提供的 `service.method` 交给 `forward`——**这就是 server 透明**：TUI 调 `lane.prompt`，server 没 Lane，forward 到已 attach 的 worker。对称地，worker 可以 `use(Sessions)` 回调 server。

`use(token)` 返回 Proxy，方法名拼成 `name.method`。abort signal 作为多余参数传给 handler。15s 无帧当死（ping 保活）。`emitTo` 让 router 按 presentationId 投递。

## 下一课

[154-experimental.mini.shared.transport.ts.md](/series/pi-source/coding-agent/715-experimental-mini-shared-transport-ts/)
