---
title: "159 · mini/server/run.ts — 路由进程"
summary: "提供 Sessions：list 用 JsonlSessionRepo；attach 若该 session 还没 worker 则 spawn worker/entry，把 client peer 记进 subscribers。forw"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/server/run.ts`

提供 `Sessions`：`list` 用 `JsonlSessionRepo`；`attach` 若该 session 还没 worker 则 spawn `worker/entry`，把 client peer 记进 `subscribers`。`forward`：非 Sessions 的 call 转到当前 attach 的 worker。worker 事件 `emitTo(presentationId)`。

空闲 10s 无连接则退出，避免和重连 TUI 抢。worker 启动 30s 超时。server **不** import AgentHarness。

## 下一课

[160-experimental.mini.worker.entry.ts.md](/series/pi-source/coding-agent/721-experimental-mini-worker-entry-ts/)
