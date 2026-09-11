---
title: "08 · session/entries.ts — Entry 行的编解码"
summary: "列上只存公共结构；类型特有字段进 payload JSON。读完应能指出四种 Entry[\"type\"] 各自 payload 去掉了哪些键，以及 custom 缺 customtype 为何 throw。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session/entries.ts`  
核心导出：`EntryRowWriter`、`decodeEntryRow`、`readEntryRows` / `scanEntryRows` / `readAllEntryRows`  
被谁调用：Storage commit/get/scan；Repo fork 插入。

## 本课目标

列上只存公共结构；类型特有字段进 `payload` JSON。读完应能指出四种 `Entry["type"]` 各自 payload 去掉了哪些键，以及 custom 缺 `custom_type` 为何 throw。

## payload 切割

`entryPayload` 从 Entry 去掉 `id/parentId/seq/timestamp/type/customType`：

- message：`message`、可选 `terminate`
- compaction：`summary`、`retainedTail`、`tokensBefore`、可选 details/usage、`fromHook`
- branch_summary：`fromId`、`summary`、可选 details/usage、`fromHook`
- custom：可选 `data`

`customType` 走单独列，便于 SQL 过滤，不必 json_extract。

`decodeEntryRow` switch `row.type`。custom 时 `custom_type === null` throw。TS 上 switch 穷尽；坏 type 会在运行时落到 undefined 返回值——schema 和写入方都只写那四个字面量。

## `EntryRowWriter`

构造时 `prepare(INSERT_ENTRY_SQL)`，`insert` 只 `run(...params)`。commit 一批很多条时避免重复 parse SQL。`insertEntryRow` 是一次性 prepare，fork 循环用 Writer。

参数顺序：session_id, id, parent_id, seq, type, custom_type, timestamp, payload。custom_type 仅 type===custom 时取 `entry.customType`。

## 查询

`readEntryRows`：`IN (...)` 绑定每个 id。请求的 id 缺行则 Storage 层不放进 Map（不 throw）。

`scanEntryRows`：可选 type/customType/fromSeq/toSeq、order、limit。这是**全 session 线性扫描**，不是按分支。分支扫描走 `branch-entries.ts`。

`readAllEntryRows`：fork scope=tree 时按 seq 排。

## 失败与边界

- payload 用 `JSON.parse`，坏 JSON 抛原生 SyntaxError，事务失败。
- `entryStructureFromRow` 不读 payload，给结构扫描用。branch 结构扫描其实自己 SELECT 不带 payload 的列。
- 不在这里维护 branch 索引。Storage 在 insert 后另调 `appendEntryToBranchIndex`。

## 下一课

scalar / list 值：[09-sqlite.session.values.ts.md](/series/pi-source/session-backends/376-sqlite-session-values-ts/)。
