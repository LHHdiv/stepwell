---
title: "59 · runtime/progress.ts — 不阻塞厂家流的耐久进度"
summary: "list 按 seq 升序分页 1000，拼成 frame 数组。recover 和 watch 快照用。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/progress.ts`

## `readAssistantFrames`

list 按 seq 升序分页 1000，拼成 frame 数组。recover 和 watch 快照用。

## `ProgressChannel`

`write` 不等待：每次 `lane.command` 追加/替换，promise 链到 `latest`，错误吞掉（fault 会从 command 冒到别处）。`seal` 后 write 变 noop。`drain` 等 latest。

`openFrameProgress`：appendList 到 pendingAssistantFrames。stillOwns：仍是对应 responseId 的 effect_pending。

`openToolProgress`：setValue 覆盖 pendingToolOutput（只要最新快照）。stillOwns：该 call 仍 effect_pending。

流式事件仍走 emitBatch；progress 只保证崩溃时磁盘上有「最新一份」。规范：checkpoint 从不证明 effect 完成。

## 失败与边界

写进度失败（例如 close）被 catch 空：流可能继续，drain 时 latest 已 reject 则 drain throw。generation 的 finally close 会等到 drain。

## 下一课

[60 · transcript.ts](/series/pi-source/agent/301-harness-runtime-transcript-ts/)。
