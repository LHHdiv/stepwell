---
title: "01 · index.ts — `node:sqlite` 工厂"
summary: "看清三档打开模式，以及 transaction 为何禁止 async callback。这是 Node 特有层；表逻辑在 src/sqlite/。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/index.ts`  
核心导出：`createNodeSqliteFactory`、`wrapNodeSqliteDatabase`，并 `export *` sqlite 后端  
被谁调用：测试、README 示例、将来的宿主。`SqliteSessionRepo` 不直接 `new DatabaseSync`，好让别的 runtime 换 factory。

## 本课目标

看清三档打开模式，以及 transaction 为何禁止 async callback。这是 Node 特有层；表逻辑在 `src/sqlite/`。

## 三档 factory

```ts
open(path)           // DatabaseSync(path) 可创建
openExisting(path)   // file URL ?mode=rw  不创建
openReadOnly(path)   // { readOnly: true }
```

`openExisting` 用 `pathToFileURL` + `mode=rw`：SQLite URI 在文件不存在时失败，避免 `open()` 误建空库。Repo 的 `open()` / `delete()` 走这条；`create` / `fork` 走 `open`（可创建）。`list` 走 `openReadOnly`。

`:memory:` 在测试里当 path 传给 `open`，合法。

## `NodeSqliteStatement`

`node:sqlite` 的 `run/get/all/iterate` 对「第一参是命名对象 vs 位置参数」重载不同。`isNamedParameters`：非 null 对象、非数组、非 TypedArray。本包 SQL 模板只用 `?` 位置参数，命名分支是适配完整性。

`changes` / `lastInsertRowid` 转 `Number`。SQLite 可能给 bigint。

## `NodeSqliteDatabase.transaction`

```ts
sql`BEGIN IMMEDIATE`.exec(this);
try {
  const result = fn();
  if (isAsyncResult(result)) throw new TypeError("SQLite transaction callbacks must be synchronous");
  sql`COMMIT`.exec(this);
  return result;
} catch {
  ROLLBACK; throw;
}
```

`BEGIN IMMEDIATE`：立刻拿写锁，避免 `DEFERRED` 在第一次写时升级失败。`node:sqlite` 的同步 API 下，callback 若返回 Promise，事务会在 await 前 COMMIT——所以显式拒绝 thenable。

`SqliteStorage.applyCommit` 整个在这个 transaction 里：插 entries、更新 branch 索引、stats、next_seq。失败全部回滚，投影不会半更新。

`wrapNodeSqliteDatabase` 给测试包装已有 DatabaseSync。

## 失败与边界

- 不设 WAL。WAL 在 Repo `configureWritableConnection`：`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000`。factory 只负责打开。
- 关闭：`db.close()`。Repo 在 session onClose 时调。
- 本文件末尾 `export * from "./sqlite/index.ts"`，所以 import 包根就能拿到 `SqliteSessionRepo`。

## 下一课

与 Node 无关的数据库能力接口：[02-sqlite.types.ts.md](/series/pi-source/session-backends/369-sqlite-types-ts/)。
