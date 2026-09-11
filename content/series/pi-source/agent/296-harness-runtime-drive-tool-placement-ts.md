---
title: "55 · drive/tool-placement.ts — 源序物化，completed 才算进树"
summary: "读助手 entry，校验每个 call 的 sourceIndex 真是 toolCall。并行执行时谁先 outcome 不一定，但挂树必须按 content 数组顺序。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/tool-placement.ts`

## `readToolBatchSource`

读助手 entry，校验每个 call 的 sourceIndex 真是 toolCall。并行执行时谁先 outcome 不一定，但挂树必须按 content 数组顺序。

## `materializeReady`

发 recovery/正常的 message_start/end（针对将要挂上的 toolResult），再 `commitPlacement`：

从前往后，连续的 `outcome_ready` 变成树上的 toolResult（parent 链），删除 pendingEntry，call → completed。中途碰到未 ready 的就停——不能把后面已完成的结果插到前面空洞之前。

整批 completed 后：若全部 terminate → finish 操作；否则 checkpoint need_assistant。发 turn_end（带 toolResults）。

## 失败与边界

staged pending 的 toolCallId/toolName 必须与助手块一致，否则 invariant。这防止 memo/结果张冠李戴。

## 下一课

[56 · structural.ts](/series/pi-source/agent/297-harness-runtime-drive-structural-ts/)：压缩与导航摘要。
