---
title: "143 · services/models-provider.ts — worker 实现 Models"
summary: "createModelsService(lane, modelRuntime, settingsManager, createState)：从 lane 读当前模型，从 ModelRuntime 填 catalog，select 时 l"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/models-provider.ts`

`createModelsService(lane, modelRuntime, settingsManager, createState)`：从 lane 读当前模型，从 ModelRuntime 填 catalog，select 时 `lane.setModel`。refresh 走 runtime.refresh，错误进 state.warning。facet 包装给 chord host。

没有 ModelRuntime 时 catalog 空、refresh no-op——测试 harness 可以这样。

## 下一课

[144-experimental.services.transcript.ts.md](/series/pi-source/coding-agent/705-experimental-services-transcript-ts/)
