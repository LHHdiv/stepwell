---
title: "144 · services/transcript.ts — 复制的 transcript"
summary: "pi.transcript 只有 state: { snapshot, event }。snapshot 是 LaneTranscriptSnapshot；event 是导致这次 publish 的 LaneWatchEvent（hyd"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/transcript.ts`

`pi.transcript` 只有 `state: { snapshot, event }`。snapshot 是 `LaneTranscriptSnapshot`；event 是导致这次 publish 的 `LaneWatchEvent`（hydration 不重放 event，避免 TUI 把历史当新 delta 刷一遍）。`ExperimentalChatView` 主要看 snapshot，`runClient` 的流式 stdout 看 event。

## 下一课

[145-experimental.services.transcript-provider.ts.md](/series/pi-source/coding-agent/706-experimental-services-transcript-provider-ts/)
