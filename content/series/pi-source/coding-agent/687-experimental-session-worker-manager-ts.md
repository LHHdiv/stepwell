---
title: "126 · experimental/session-worker-manager.ts — 按会话孵化 worker"
summary: "每个 sessionId 对应一个 WorkerRecord（pid、token、pluginManifestPaths、attachmentIds）。attach 时 spawn session-worker，经 coordinato"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/session-worker-manager.ts`

每个 sessionId 对应一个 `WorkerRecord`（pid、token、pluginManifestPaths、attachmentIds）。attach 时 spawn `session-worker`，经 coordinator 把 presentation 的 service call 转到 worker 的 control socket。demand 超时、startup 15s、shutdown 10s。

`SessionPluginSelectionConflictError`：同一会话不能同时用两套 plugin 包路径。profile 写在 server 目录。

worker 事件用 typebox `SessionWorkerEventSchema` 校验。停止时 expectedStop 避免把主动杀当成崩溃。

## 下一课

[127-experimental.session-worker.ts.md](/series/pi-source/coding-agent/688-experimental-session-worker-ts/)
