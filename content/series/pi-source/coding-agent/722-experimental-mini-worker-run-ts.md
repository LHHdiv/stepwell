---
title: "161 · mini/worker/run.ts — 真正的 Agent 住这里"
summary: "parentConnection() 建 peer。打开或创建 Jsonl 会话，AgentHarness + bash/edit/read/write，短系统提示。LaneService / ModelsService provide"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/worker/run.ts`

`parentConnection()` 建 peer。打开或创建 Jsonl 会话，`AgentHarness` + bash/edit/read/write，短系统提示。`LaneService` / `ModelsService` `provide` 到 peer。`Worker.describe` 返回 sessionId。可以 `use(Sessions)` 反调 server。

live 对象不出进程。TUI 崩溃不影响正在跑的 prompt——这就是拆进程的意义。

## 下一课

[162-experimental.mini.worker.lane-service.ts.md](/series/pi-source/coding-agent/723-experimental-mini-worker-lane-service-ts/)
