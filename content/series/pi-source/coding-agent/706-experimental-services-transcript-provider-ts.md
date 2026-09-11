---
title: "145 · services/transcript-provider.ts — watch lane 并 publish"
summary: "createTranscriptService(lane, createState)：lane.watch()，用 reduceLaneSnapshot 折事件。watch 间隙用 rebase 再订一次，避免和 harness 缓冲错"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/transcript-provider.ts`

`createTranscriptService(lane, createState)`：`lane.watch()`，用 `reduceLaneSnapshot` 折事件。watch 间隙用 rebase 再订一次，避免和 harness 缓冲错位。`createTranscriptServiceFacet` 给 worker FacetHost。

dispose 停 watch。rebase 失败记下来，下次 activate 再试。

## 下一课

[146-experimental.services.slash-commands.ts.md](/series/pi-source/coding-agent/707-experimental-services-slash-commands-ts/)
