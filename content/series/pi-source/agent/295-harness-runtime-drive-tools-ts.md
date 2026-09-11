---
title: "54 · drive/tools.ts — 意图 → 副作用 → outcome_ready → 按源序物化"
summary: "planned：只知道 sourceIndex 和预留 resultEntryId。 effectpending：args 已写入 pi.op.toolargs，replay 已定。 outcomeready：pi.pending.en"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/tools.ts`  
对位 agent-loop 的 `executeToolCalls`，但每一步都有磁盘状态。

## 调用状态

`planned`：只知道 sourceIndex 和预留 resultEntryId。  
`effect_pending`：args 已写入 `pi.op.tool_args`，replay 已定。  
`outcome_ready`：`pi.pending.entry` 里有最终 toolResult，尚未挂到树。  
`completed`：entry 已在树上门，pending 已删。

## 新调用 `startToolInvocation`

prepareToolCall（未知名/校验失败 → 立即 outcome，不占 effect_pending）。length 截断整批失败结果，不执行——与 loop 相同安全阀。before_tool 过 gate。然后 `publishToolIntent`：args 落盘、状态 effect_pending、tool_start 事件。再 `performToolInvocation`。

## 执行

`openToolProgress`：onUpdate 带 checkpoint 时 set `pi.pending.tool_output`。live `tool_update` 事件不耐久。execute 走 `execution/tools.ts` 的 gate.admit。after_tool。AbortRequested：recovery 时用 checkpoint 合成 interrupted，否则 aborted 结果。

`replay: "safe"` 且崩溃在 effect_pending：`clearReplayCheckpoint` 删 output，用持久 args **重跑**。`replay: "never"`：不重跑，interruptedOutcome（附上最新 checkpoint 文本 + 警告）。

## 顺序 vs 并行

`runSequential`：循环有上界 `calls.length * 2 + 1`。每次先 `materializeReady`（把已 outcome_ready 的按源序挂树），再推进最早未完成的 call。取消时把剩余 planned 标 aborted、pending 标 interrupted。

`runParallel`：planned/pending 都 start/recover，完成回调串行 scheduleMaterialization，保证挂树顺序仍是源序。`tool_end` 仍按完成序发出。

`runTools` 入口：若已有 pending/outcome_ready，先发 recovery turn_start。取消中的批次走 sequential 且 execution=undefined（只收尾，不开新工具）。

## memo

`invocationCapability` 提供 getMemo/setMemo，写 `pi.op.tool_memo`。outcome 时删掉该 invocation 的 memo。expire 后调用 throw。

## 失败与边界

terminate：仅 control 仍 running 时写入 durable terminate；整批都 terminate 才在 placement 里结束 run（tool-placement）。混合批次继续 checkpoint need_assistant。

## 下一课

[55 · tool-placement.ts](/series/pi-source/agent/296-harness-runtime-drive-tool-placement-ts/)。
