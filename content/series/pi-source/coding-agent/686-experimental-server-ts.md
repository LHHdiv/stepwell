---
title: "125 · experimental/server.ts — 实验会话服务器"
summary: "这是「产品级」实验 server：Unix socket + 可选 Radius 中继 + 每会话一个 worker 进程。对比 mini/server：mini 自己实现 JSON RPC；这里用 @earendil-works/pi"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/server.ts`（约 798 行）

## 本课目标

这是「产品级」实验 server：Unix socket + 可选 Radius 中继 + 每会话一个 worker 进程。对比 mini/server：mini 自己实现 JSON RPC；这里用 `@earendil-works/pi-server` 和 chord 服务。

## 关键 API

- `resolveServerDirectory`：`PI_SERVER_DIR` 或 `~/.pi/server`，chmod 700、必须当前 uid。
- `resolveSessionDirectory`：`~/.pi/agent/experimental/sessions`。
- `acquireServerProfile`：锁 `launcher-<serverId>`，默认 id 写在 `default-server-id`。
- `startServer` / `startForegroundServer`：建 Unix server、coordinator、`SessionWorkerManager`、RadiusRelayHost、chord 服务（SessionDirectory/Management/PresentationPlugins）。
- `activateServer`：client 侧若没发现已有 server，可拉起一个。
- `runServerProcess`：内部角色 `server` 的入口。

前台模式打印 socket 路径，等信号。worker 不在本进程跑 Agent：`SessionWorkerManager` spawn `session-worker`。

## 下一课

[126-experimental.session-worker-manager.ts.md](/series/pi-source/coding-agent/687-experimental-session-worker-manager-ts/)
