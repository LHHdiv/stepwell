---
title: "150 · services/worker.ts — worker 内 FacetHost 与远端 endpoint"
summary: "createSessionWorkerServices：搭 FacetHost，装 AgentController、Models、Transcript、SessionPlugins 等 facet。每个 (serverConnectio"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/worker.ts`

`createSessionWorkerServices`：搭 FacetHost，装 AgentController、Models、Transcript、SessionPlugins 等 facet。每个 `(serverConnectionId, attachmentId)` 一对 `RemoteServiceEndpoint`。`invoke(call, scope)` 把 manager 转发来的 chord call 打进对应 endpoint。`publish` 把 provider update 送回 server。

这是 session-worker.ts 和控制信道之间的服务运行时。

## 下一课

迷你架构导读：[151-experimental.mini.main.ts.md](/series/pi-source/coding-agent/712-experimental-mini-main-ts/)
