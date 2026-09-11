---
title: "162 · mini/worker/lane-service.ts — Lane 服务实现"
summary: "每个 presentation 一次 watch：lane.watch() + UUID，harness 保证 snapshot 和后续事件无缝。start 才 publish 缓冲。prompt/steer/followUp/comp"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/worker/lane-service.ts`

每个 presentation 一次 `watch`：`lane.watch()` + UUID，harness 保证 snapshot 和后续事件无缝。`start` 才 `publish` 缓冲。`prompt/steer/followUp/compact/abort/setModel` 调 `AgentLane`，错误变成 `{ok:false,error}`。

`publish(subscriptionId, to, event)` 由 run.ts 接到 `peer.emitTo(Lane, ..., presentationId)`。

不要在这里再做一份事件对齐。

## 下一课

[163-experimental.mini.worker.models-service.ts.md](/series/pi-source/coding-agent/724-experimental-mini-worker-models-service-ts/)
