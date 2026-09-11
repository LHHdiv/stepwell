---
title: "15 · sqlite/index.ts — 后端子目录导出"
summary: "有 SqliteSessionRepo、SqliteStorage、sql、版本常量（从 repo 出来）、类型。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/index.ts`  
被谁调用：包根 `src/index.ts` 的 `export *`。

```ts
export * from "./repo.ts";
export * from "./sql.ts";
export * from "./storage.ts";
export type { SqliteDatabase, SqliteDatabaseFactory, SqliteRunResult, SqliteStatement } from "./types.ts";
```

有 `SqliteSessionRepo`、`SqliteStorage`、`sql`、版本常量（从 repo 出来）、类型。

没有：`SqliteOpenSession`（从 repo.ts 再 export？session.ts 未被这文件 export）。检查 repo.ts：它 import SqliteOpenSession 当返回类型，`create(): Promise<SqliteOpenSession>`。`SqliteOpenSession` 类若未被 export *，调用方看到的是返回值结构（实现了 Session）。类构造函数不在 public API——不能自己 `new SqliteOpenSession`。对。session.ts 没有从 sqlite/index 出去。

`migrations.ts` 也没导出。`applyInitialSchema` 仅 repo 内部用。测试若直接 `new SqliteStorage` 会自己 `applyInitialSchema`（test 文件从 migrations 或 exec sql 导入）。看 storage-conformance：它 import factory 和 SqliteStorage，自己 open :memory: 并 exec schema。

`session/*.ts` 全部包内。

包根 index 再叠 `createNodeSqliteFactory`。宿主的典型 import：

```ts
import { BACKGROUND_CONTEXT } from "@earendil-works/pi-agent-core";
import { createNodeSqliteFactory, SqliteSessionRepo } from "@earendil-works/pi-session-backend-sqlite-node";
```

## 本课收束

sqlite-node 把 harness 的 `Storage` 落成：WAL 文件、同步事务、分支投影、进程内所有权集合。现行 `./pi-test.sh` 交互/print 仍用 JSONL；实验 server 也仍是 JsonlSessionRepo。等宿主把 `openSession` 换成 `SqliteSessionRepo`，本包才进入远程会话执行链。

对照阅读：agent-core `harness/session/types.ts` 的 `Storage`；conformance 测试在 `packages/agent/test/harness/` 与本包 `test/*-conformance.test.ts`。
