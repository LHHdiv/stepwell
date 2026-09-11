---
title: "127 · experimental/session-worker.ts — 一会话一进程"
summary: "worker 拥有真正的 AgentHarness、ModelRuntime、JSONL repo。presentation 只通过 chord remote service 调 AgentController、读 Transcript"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/session-worker.ts`（约 884 行）

## 本课目标

worker 拥有真正的 `AgentHarness`、`ModelRuntime`、JSONL repo。presentation 只通过 chord remote service 调 `AgentController`、读 `Transcript`。

环境变量：control address/token、session key、peer id。控制信道 JSONL：operation / service call / provider update。`WorkerLifecycle` 管 demand grace（没人 attach 一段时间就退）和孤儿检测。

`runSessionWorkerWithHarness` 可注入 harness 工厂（测试）。`runSessionWorkerProcess` 是角色入口。选项 schema 校验 sessionDir、metadata、pluginManifestPaths。

工具在 worker 里 `createBashTool` 等，cwd 是会话 metadata.cwd。插件 facet loader 用 `createSessionPluginFacetLoader`。

## 下一课

[128-experimental.client-runtime.ts.md](/series/pi-source/coding-agent/689-experimental-client-runtime-ts/)
