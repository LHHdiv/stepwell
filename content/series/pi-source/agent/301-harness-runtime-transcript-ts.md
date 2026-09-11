---
title: "60 · runtime/transcript.ts — 把 commit 变成 message 事件链"
summary: "给一组尚无 parent 的条目串到 parentId 上，每条的 id 成为下一条的 parent。accept 用户句、checkpoint inbox 都用它。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/transcript.ts`

## `chainEntries`

给一组尚无 parent 的条目串到 parentId 上，每条的 id 成为下一条的 parent。accept 用户句、checkpoint inbox 都用它。

## 事件

`entryLifecycleEvents`：message 发 message_start + message_end + entry_added；其它类型只 entry_added。`committedEntryEvents` 用 commit.seqs/timestamp 填进 entry。

## 读上下文

`readBoundedEntries`：从 tip newestFirst 扫到 compaction，reverse 成时间正序。`readBoundedContext` 再 `buildSessionContext`。cancel_requested 时不读。

`readLaneQueues` / `readPendingMessages`：inbox id → pendingEntry 载荷。类型不对 invariant。

## 下一课

[61 · reducer.ts](/series/pi-source/agent/302-harness-runtime-reducer-ts/)。
