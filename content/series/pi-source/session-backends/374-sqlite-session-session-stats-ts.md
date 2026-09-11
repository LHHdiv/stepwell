---
title: "07 · session/session-stats.ts — 投影的计数和用量"
summary: "SessionStats 是 { messageCount, usage }。不每次 SUM(usageledger)。权威仍是 ledger；本表是缓存。回滚事务时缓存一起回滚，所以不会漂。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session/session-stats.ts`  
被谁调用：`applyCommit` 在插 message entry / usage 行之后；`getStats`；commit 返回值里的 `stats`。

## 本课目标

`SessionStats` 是 `{ messageCount, usage }`。不每次 SUM(usage_ledger)。权威仍是 ledger；本表是缓存。回滚事务时缓存一起回滚，所以不会漂。

## `addUsage`

逐项相加。`cacheWrite1h` / `reasoning` 仅当两边至少一边定义才出现在结果里（都缺则省略键）。cost 五个字段始终加。JSON 写回 `usage_payload`。

`incrementMessageCount`：`message_count = message_count + 1`。只在 `entry.type === "message"` 时调。compaction / custom 不加。fork 用 `updateForkSessionStats` 一次性 SET（repo.ts），不走 +1 循环。

`readSessionStats` 经 `readSessionRow`，未知 id 仍 throw。

## 失败与边界

- 缓存与 ledger 在同一事务更新。没有独立 rebuild。若有人手工改表，getStats 会撒谎；产品路径不提供手工改。
- `addUsageToSessionStats` 先读再写，事务里无并发写者（IMMEDIATE + 单 Storage 队列）。

## 下一课

entry 编解码：[08-sqlite.session.entries.ts.md](/series/pi-source/session-backends/375-sqlite-session-entries-ts/)。
