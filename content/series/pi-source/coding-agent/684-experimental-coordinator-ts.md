---
title: "123 · experimental/coordinator.ts — 多 server 消息路由"
summary: "实验架构允许同一机器多个 server 进程。coordinator 听 Unix control socket，server 注册 { protocol: 3, serverConnectionId, endpoint }，之后 se"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/coordinator.ts`

实验架构允许同一机器多个 server 进程。coordinator 听 Unix control socket，server 注册 `{ protocol: 3, serverConnectionId, endpoint }`，之后 `send`/`broadcast` 不透明 payload。同 id 再注册会 `server_replaced`。

`ensureCoordinator`：尝试 connect，失败则 `spawnInternalProcess("coordinator")`，租约在持有期间保活。`CoordinatorConnection` 是 server 侧客户端。`runCoordinatorProcess` 是子进程主循环。

JSON 行协议，typebox 校验。这是「server 之间」的总线，不是 presentation 到 worker 的 RPC（那是 pi-client / mini rpc）。

## 下一课

[124-experimental.coordinator-entry.ts.md](/series/pi-source/coding-agent/685-experimental-coordinator-entry-ts/)
