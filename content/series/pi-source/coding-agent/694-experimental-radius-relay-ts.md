---
title: "133 · experimental/radius-relay.ts — WebSocket 字节中继"
summary: "把 pi-client 的 ByteTransport 接到 Radius WebSocket。子协议 pi-session-relay.host.v1 / .client.v1。二进制帧：version、type、connection"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/radius-relay.ts`

把 pi-client 的 ByteTransport 接到 Radius WebSocket。子协议 `pi-session-relay.host.v1` / `.client.v1`。二进制帧：version、type、connectionId UUID、payload。host 端 `RadiusRelayHost` 接受远端 client、复用本地 `Server`。client 端 `createRadiusClientTransportFactory` + `RadiusClientReconnect` 指数退避（缺 auth 30s 一试）。

pending 字节上限防 OOM。关闭码：浏览器 WebSocket 不能发 1002，改用 4000/4001。

这是「把 Unix socket 上的同一套协议抬到网上」，不是另一套 RPC。

## 下一课

插件：[134-experimental.plugin.ts.md](/series/pi-source/coding-agent/695-experimental-plugin-ts/)
