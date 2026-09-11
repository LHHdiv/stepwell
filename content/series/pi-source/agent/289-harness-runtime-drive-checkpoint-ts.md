---
title: "48 · drive/checkpoint.ts — starting 注入与每次「再问不问」的枢纽"
summary: "continueOperation 读 intent.promptEntryIds 的消息。beforerun 可注入更多消息（不得 pending assistant）。注入的 id 现生成，chainEntries 挂到 tip，状"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/checkpoint.ts`

## `startRun`

continueOperation 读 intent.promptEntryIds 的消息。`before_run` 可注入更多消息（不得 pending assistant）。注入的 id 现生成，chainEntries 挂到 tip，状态改 `checkpoint` + `need_assistant`。无注入且原来也没有用户句时，trigger 必须已有 tip。

## `runCheckpoint`

1. `prepareCompactionThreshold`：若启用压缩且 token 超窗，且 trigger 之后还没有更新的 compaction 条目
2. planBoundaryInbox（若 continuation 是 may_finish 且无阈值压缩，允许拉 followUp）
3. 有新 trigger → assistant.ready
4. 有阈值准备 → summary.deciding reason=threshold，boundary=resume_checkpoint（摘要后回到这个 continuation）
5. need_assistant 无新 inbox → 仍 assistant.ready（用原来的 trigger）
6. may_finish 且没东西做 → finish_pending → `finishRunBoundary`

一次 checkpoint **至多一个 commit**（注释）。阈值压缩和 inbox 物化可以在同一事务。

## 与 agent-loop 对照

loop 的 prepareNextTurn + shouldStopAfterTurn + 拉 steer 被拆成：durable checkpoint 叶子 + 本过程的一次事务。压缩不再是「停 loop 让 Session 再 continue」，而是同一 operation 切到 summary.*。

## 下一课

[49 · generation.ts](/series/pi-source/agent/290-harness-runtime-drive-generation-ts/)。
