---
title: "47 · drive/boundary.ts — checkpoint 上的 inbox 物化与收尾"
summary: "enabled ? maxRetries+1 : 1 次尝试。maxAgentDelayMs 缺省用 pi-ai 默认。这个快照写进 generationContext，本轮 retry 不因宿主中途 setRetryPolicy 而变"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/boundary.ts`  
被谁调用：`startRun` 之后的 `runCheckpoint`、结构摘要结束后回到 run、`finishRunBoundary`。

## `normalizedRetryPolicy`

`enabled ? maxRetries+1 : 1` 次尝试。`maxAgentDelayMs` 缺省用 pi-ai 默认。这个快照写进 `generationContext`，本轮 retry 不因宿主中途 setRetryPolicy 而变。

## `assistantReadyAtBoundary`

造 `assistant.ready` 叶子：新 stepId、triggerEntryId、当时的 lane 配置和 streamOptions、overflowRecoveryUsed 标志。

## `planBoundaryInbox`

选 inbox：

1. 全部 `write` + 按 steeringMode 取 steer（all 或第一条）
2. 加载 pendingEntry；message 或有 projector 的 custom 算「能投影」
3. 若 `followUpWhenNoTrigger` 且还没有能投影的条目，再按 followUpMode 取 followUp
4. 按原 inbox 顺序链到 tip 上，能投影的最后一条当 triggerEntryId
5. writes：insertEntry、delete pending、更新 tip；返回剩余 inbox 和可选 queue 快照

这是 harness 版 getSteeringMessages/getFollowUpMessages，但是 **durable**：消息在 pending 里，崩溃不丢。

## `finishRunBoundary`

在 `may_finish` 时：

1. `before_run_end` 钩子可给一段 followUp 字符串
2. 再 planBoundaryInbox（含 followUp）
3. 若出现 trigger → 不去结束，转 assistant.ready
4. 若 inbox 计划与钩子前相同且钩子给了 followUp → 插入该 user 消息再问模型
5. 否则 cleanup + result completed + run_end

对应 loop 的外层 followUp。钩子 followUp 只在「没有其它新 trigger」时生效，避免和用户队列抢。

## 失败与边界

`includeFinalAssistant` 为真却没有 latestAssistantEntryId → invariant。空会话 completed 也要求有 tip。

## 下一课

[48 · checkpoint.ts](/series/pi-source/agent/289-harness-runtime-drive-checkpoint-ts/)。
