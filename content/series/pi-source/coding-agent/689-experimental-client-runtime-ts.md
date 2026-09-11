---
title: "128 · experimental/client-runtime.ts — 打开到 server 的 Client"
summary: "openClientRuntime(command)：--connect unix:path 或 radius:serverId，或发现 ~/.pi/server 里所有 Unix server。Radius 才允许 --auth。自动"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/client-runtime.ts`

`openClientRuntime(command)`：`--connect unix:path` 或 `radius:serverId`，或发现 `~/.pi/server` 里所有 Unix server。Radius 才允许 `--auth`。自动激活新 server 时才能带 `--model`。

每个 route 一个 `pi-client` `Client` + `createServerServiceSource` / `createSessionServiceSource`。`activateBuiltinClientServices` 再绑上 SessionDirectory、Management、Plugins、Models、AgentController、Transcript。

`dispose` 关所有 client。发现多台时 list 会扁平化所有 session。

## 下一课

[129-experimental.client.ts.md](/series/pi-source/coding-agent/690-experimental-client-ts/)
