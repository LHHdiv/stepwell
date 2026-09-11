---
title: "20 · telemetry.ts — 两份 schema，生产几乎只开 hook span"
summary: "规范 T1：词汇表已经声明，生产路径目前主要给工具钩子开 span。不要以为每次 lane.prompt 都有 pi.harness.run 树。读 schema 是为了以后接 OpenTelemetry，不是为了现在在日志里找这些名字"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/telemetry.ts`  
被谁调用：`startAiSpan`（pi-ai 请求）、`startHarnessSpan`（hooks.ts 的 before/after_tool）；`AGENT_TELEMETRY_SCHEMAS` 给文档生成脚本。

## 本课目标

规范 T1：词汇表已经声明，生产路径目前主要给工具钩子开 span。不要以为每次 `lane.prompt` 都有 `pi.harness.run` 树。读 schema 是为了以后接 OpenTelemetry，不是为了现在在日志里找这些名字。

## `AI_TELEMETRY_SCHEMA`

span `pi.ai.request`：operation = stream / fetch_deferred / cancel_deferred / generate_images。start 带 provider、model、api、streaming、可选 deferred。end 带 usage、http status、stop_reason、stream chunk 统计、error.type。

`startAiSpan` 从 context 取 TelemetryContext，没有就 noop。

## `HARNESS_TELEMETRY_SCHEMA`

声明了运行时树：

- `pi.harness.run` / `compaction` / `navigation`（根或外部 parent）
- 子：`checkpoint`、`assistant`、`tools`、`tool`、`deferred`、`summary`、`hook`

属性共享 `pi.lane.name`、`pi.operation.id`、outcome、error。`pi.harness.hook` 带 hook 名。

`AGENT_TELEMETRY_SCHEMAS = [AI, HARNESS]`。`scripts/generate-telemetry-docs.ts` 靠它生成 `docs/telemetry-schema.md`。

## `startHarnessSpan`

和 startAiSpan 同样：`getTelemetryContext` → `withTelemetryContext` 包住 fn。hooks.ts 里每个 tool registration 一次。

## 失败与边界

noop context 上 start 不会 throw，只是空操作。schema 的 `values` 枚举是文档/校验用；运行时若写出枚举外的字符串，typed starter 在编译期挡住。

## 下一课

公共面结束。进入 Session：[21 · session/index.ts](/series/pi-source/agent/262-harness-session-index-ts/)。
