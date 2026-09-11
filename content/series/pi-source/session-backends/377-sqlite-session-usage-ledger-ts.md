---
title: "10 · session/usage-ledger.ts — 用量行"
summary: "每笔模型用量一行，可挂 entryid，可标 adjustment（更正而非原始）。id 与 entries 共享命名空间（触发器）。Writer 同样预 prepare。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session/usage-ledger.ts`  
被谁调用：Storage commit `kind==="usage"`；`scanUsage`。

## 本课目标

每笔模型用量一行，可挂 `entry_id`，可标 `adjustment`（更正而非原始）。id 与 entries 共享命名空间（触发器）。Writer 同样预 prepare。

## 行映射

| 列 | 字段 |
|---|---|
| id, seq | 同名 |
| entry_id | 缺省 SQL null |
| adjustment | boolean → 0/1 |
| usage | JSON |
| details | 缺省 null，否则 JSON |

`decodeUsageLedgerRow`：adjustment `!== 0`；可选字段用条件展开省略。

`scanUsageLedgerRows`：fromSeq/toSeq/order/limit，与 entry scan 同形。按 seq 不是按时间。

## 失败与边界

- 插 usage 后 `addUsageToSessionStats` 把 **row.usage** 加进缓存。adjustment 行也加——core 若用负数 usage 做更正，加法仍成立。本文件不解释符号。
- 与 entries 重复 id 由触发器 ABORT，事务失败，commit Promise reject。

## 下一课

本包最绕的投影：分支成员索引：[11-sqlite.session.branch-entries.ts.md](/series/pi-source/session-backends/378-sqlite-session-branch-entries-ts/)。
