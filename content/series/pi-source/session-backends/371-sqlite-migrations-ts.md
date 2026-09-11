---
title: "04 · migrations.ts + 001_initial.sql — 容器 schema"
summary: "一份 SQLite 文件是 session 容器：默认一文件一 session，但每张表都带 sessionid，共享容器（databasePath）能装多个。读完应能指出权威表 vs 投影表，以及 INSERT 触发器代替 TypeS"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/migrations.ts`  
同课 SQL：`src/sqlite/migrations/001_initial.sql`  
构建：`scripts/copy-migrations.mjs` 把 sql 拷到 `dist/sqlite/migrations/`（tsc 不复制非 ts）。

## 本课目标

一份 SQLite 文件是 **session 容器**：默认一文件一 session，但每张表都带 `session_id`，共享容器（`databasePath`）能装多个。读完应能指出权威表 vs 投影表，以及 INSERT 触发器代替 TypeScript 预检。

`applyInitialSchema`：按 `import.meta.url` 读旁路 `001_initial.sql`，`db.exec` 整份。`CREATE IF NOT EXISTS`，对已初始化的库幂等。没有多版本 migrate 循环——`storage_version` 不匹配直接 throw（见 session-row）。当前 `SQLITE_STORAGE_VERSION = 1`，注释写 AgentHarness storage format 4。

## 权威表

### `sessions`

`id` PK WITHOUT ROWID。`created_at`、`parent_session_id`、`storage_version`、`metadata`（预留 JSON，insert 时 null）、`message_count`、`usage_payload`（JSON Usage）、`next_seq`。

`next_seq` 是下一笔 commit 的起始序号。新 session 从 1 起。fork 带过来的 snapshot 用 `snapshot.nextSeq`。

### `entries`

`(session_id, id)` PK。`parent_id`、`seq`、`type`、`custom_type`、`timestamp`、`payload`（JSON，类型相关字段）。索引：parent、`(session_id, seq, type)`。

### `scalar_values` / `list_values`

地址是 `(namespace, key)`。scalar 同一地址一行，ON CONFLICT 更新。list 的 PK 含 `seq`，只追加。值都是 JSON 文本。

### `usage_ledger`

独立 id 空间与 entries **共享**「不能同 id」。`adjustment` 整数 0/1。`entry_id` 可空。

## 触发器：跨表完整性

`trg_entries_validate` BEFORE INSERT：

- `parent_id` 非空则必须已有同 session 的父行 → `missing parent entry`
- id 不得已在 usage_ledger → `duplicate entry or usage id`

`trg_usage_ledger_validate`：反过来查 entries。

同表重复 id 靠 PRIMARY KEY。这样 `applyCommit` 不必先在 TS 里扫一遍图。失败整事务 ROLLBACK。

## 投影：`branch_entries` / `branch_meta`

JSONL 没有这份索引。每次 insert entry，`appendEntryToBranchIndex` 维护：

- 一条分支的成员 `(session_id, branch_id, entry_id)` + `entry_seq` + `entry_type`
- `branch_meta`：tip、可选 `base_branch_id` + `base_seq`（压缩点之后才在本段存前缀）

索引设计写在 SQL 注释里：`ix_be_seq` 让 ORDER BY entry_seq 覆盖 id-only 读；`ix_be_type` 过滤 type；`ix_bm_tip` unique(tip_entry_id) 让「父是某分支 tip」O(1)。

## 失败与边界

- 没有 FTS。README：search 是另开的 S3 projection，本包不导出 search。
- `WITHOUT ROWID`：PK 即聚簇。按 id 点查快，按 seq 靠二级索引。
- 迁移文件改了必须 bump `SQLITE_STORAGE_VERSION` 并写新 sql；现在打开旧库会 `requires migrations`，还没有自动升级器。
- `copy-migrations.mjs`：`cp` 整个目录。漏跑则 dist 里 `applyInitialSchema` 读文件失败。

## 下一课

sessions 行如何变成元数据：[05-sqlite.session.session-row.ts.md](/series/pi-source/session-backends/372-sqlite-session-session-row-ts/)。
