---
title: "50 · drive/response.ts — 流式帧、after_response、一条事务定乾坤"
summary: "AssistantMessageFrameEncoder 把事件编成可 append 的 frame。observer.start/update 写 frame（非所有事件都有 frame）并发 message。end 发 messag"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/response.ts`

## `openAssistantResponse`

`AssistantMessageFrameEncoder` 把事件编成可 append 的 frame。observer.start/update 写 frame（非所有事件都有 frame）并发 message_*。end 发 message_end（此时 entry 还没落树）。`afterResponse`：先 close（drain 帧），再 after_response 钩子，钩子可换整条 settled 消息。

帧在 `pi.pending.assistant_frame` list 上。结算事务删除该 list 并 insert 完整 entry。

## `publishResponse` 分类（同一 settleOperation）

输入：effect_pending（assistant 或 deferred）+ 一条 SettledAssistantMessage。

| 条件 | 下一状态 / 结果 |
|---|---|
| 已 cancel_requested | 消息标 aborted，checkpoint may_finish |
| 仍 running 却收到 aborted | invariant（取消应走 control 位） |
| overflow 且未用过 overflow recovery | 消息标 error，summary.deciding reason=overflow，resume 时 overflowRecoveryUsed=true |
| overflow 已用过或准备失败 | operation failed |
| stopReason=deferred 且 handle 合法 | deferred.suspended（poll=0 或保持） |
| deferred handle 非法 | failed |
| error 且可 retry 且 attempt<max | assistant.retry_wait |
| error 不可 retry | failed |
| 有 toolCall | tools，为每个 call 预留 resultEntryId（时间戳对齐 response 的 uuidv7） |
| toolUse 但无 call | failed |
| 其它（stop） | checkpoint may_finish includeFinalAssistant |

事务始终：insert 助手 entry（预留的 id）、insert usage、更新 tip、删 frame list。失败则附 cleanup+result。事件含 entry_added、usage、retry_*、turn_end（若无工具）、compaction_start、run_suspend、run_end。

`uuidV7Timestamp(responseEntryId)` 让工具结果 id 与助手 id 同一毫秒前缀，排序好看。

## 失败与边界

钩子改消息发生在结算事务 **之前**。钩子 throw 非 AbortRequested 会炸 performGeneration。recovery 路径 `options.recovery` 抑制部分重复 turn 事件。

## 下一课

[51 · recovery.ts](/series/pi-source/agent/292-harness-runtime-drive-recovery-ts/)：窗口内崩溃怎么合成消息。
