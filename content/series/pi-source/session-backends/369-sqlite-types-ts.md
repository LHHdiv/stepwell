---
title: "02 · sqlite/types.ts — 后端用的最小 SQLite 能力"
summary: "为什么拆 factory：agent-core 不绑 Node builtin；将来 Bun / 别的 native binding 只要实现 SqliteDatabaseFactory 就能复用 src/sqlite/（目前和 Nod"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/types.ts`  
被谁调用：`sql.ts`、所有 `session/*.ts`、`storage.ts`、`repo.ts`。表逻辑 **只** 依赖这些接口，不 import `node:sqlite`。

## 本课目标

为什么拆 factory：agent-core 不绑 Node builtin；将来 Bun / 别的 native binding 只要实现 `SqliteDatabaseFactory` 就能复用 `src/sqlite/`（目前和 Node 适配器发在同一包）。

## 三个接口

`SqliteRunResult`：`changes`、可选 `lastInsertRowid`。

`SqliteStatement`：`run` / `get` / `all` / `iterate`，params 是 `unknown[]`。`EntryRowWriter` 预 prepare 一条 INSERT，热路径不经模板。

`SqliteDatabase`：`exec`（无参数 DDL/PRAGMA）、`prepare`、`transaction`（同步）、`close`。

`SqliteDatabaseFactory` 三档语义写在注释里，Repo 依赖「openExisting 不创建」来实现「open 缺失文件必须失败」。

## 失败与边界

没有 query builder 类型。SQL 字符串在 `sql` 模板和少数常量里。注入防护靠参数绑定，不靠这里。

## 下一课

带参数的 SQL 模板：[03-sqlite.sql.ts.md](/series/pi-source/session-backends/370-sqlite-sql-ts/)。
