---
title: "45 · runtime/restore.ts — 读磁盘，不解释、不开工"
summary: "readLaneStorage 并行读 tip / config / laneState："
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/restore.ts`  
被谁调用：`createAgentHarness`、`Harness.lane` 发现磁盘上已有 lane 时。

## 分类

`readLaneStorage` 并行读 tip / config / laneState：

| 三者 | kind |
|---|---|
| 全缺 | absent |
| 只有 tip | branch（纯数据路径） |
| 三件齐 | lane |
| 缺 tip 或缺其中一件 | SessionInvariantError |

## `restoreSession`

scan 所有 `pi.branch.tip`、`pi.lane.config`、`pi.lane.state` 前缀，并集名字，只 restore kind=lane 的。纯 branch 不进 `lanesByName`。

## `restoreLaneState`

若 currentOperationId 非 null：读 op.meta 和 op.state。校验：meta.operationId 匹配、meta.lane 匹配、`stateMatchesIntent`：

- compaction intent ↔ summary.* 且 boundary=finish
- navigation intent ↔ 无摘要则 navigation.ready_to_commit 字段一致；有摘要则 summary.* 且 commit_navigation 目标一致
- run intent ↔ 不是 navigation.ready_to_commit，且若在 summary 则 boundary 是 resume_checkpoint

不匹配 → invariant。restore **不**根据 at 去跑 recover——那是第一次 drive 的事。

## 失败与边界

缺 op.meta/state 是 invariant，不是「当 idle」。宁可打不开 harness，也不带着半截 operation 往下跑。

## 下一课

[46 · drive.ts](/series/pi-source/agent/287-harness-runtime-drive-ts/)。
