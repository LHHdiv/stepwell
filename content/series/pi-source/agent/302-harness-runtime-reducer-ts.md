---
title: "61 · runtime/reducer.ts — 远程消费者用事件修补 LaneSnapshot"
summary: "watch 先给完整 snapshot，之后只推事件。reduceLaneSnapshot(snapshot, event) 就地改 snapshot。返回 \"rebase\" 表示这次补丁不够，必须 resnapshot（导航改了祖先路"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/reducer.ts`  
包出口：`@earendil-works/pi-agent-core/harness/runtime/reducer`。

## 本课目标

watch 先给完整 snapshot，之后只推事件。`reduceLaneSnapshot(snapshot, event)` **就地改** snapshot。返回 `"rebase"` 表示这次补丁不够，必须 resnapshot（导航改了祖先路径）。

## 要点

- 带 `lane` 且不是本 lane 的事件（除 usage）忽略
- run/compaction/navigation_start：填 operation 壳（status open，runningTools []）
- message_start 仅当 pending 助手时设 streamingMessage
- tool_start/update/end 维护 runningTools；entry_added 且是 toolResult 时从 runningTools 删掉（已进 transcript）
- compaction entry_added：**splice 整段 transcript 成 [该 compaction]**（窗口重置）
- 其它 entry_added：push，更新 tip、messageCount
- run_end / compaction_end：lastResult，operation=null
- navigation_end：return `"rebase"`，不猜新 transcript
- fault：faulted=true
- turn_* / handler_error / value_update / lane_created：noop

## 失败与边界

reducer 信任事件形状（JsonRepresentation 已在边界校验）。乱序或丢事件会导致 snapshot 错——那是传输问题，resnapshot 恢复。不要在 UI 线程外无锁共用同一 snapshot 对象。

## 下一课

执行原语：[62 · effect-gate.ts](/series/pi-source/agent/303-harness-execution-effect-gate-ts/)。
