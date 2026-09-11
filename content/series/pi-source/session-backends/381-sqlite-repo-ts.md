---
title: "14 · repo.ts — `SqliteSessionRepo` 文件布局和 fork"
summary: "这是后端的「目录」。读完应能指出：session id 如何变成文件名、共享容器和一文件一 session 的差异、open 为何校验 path 在仓库内、fork 何时走活 Storage 的 snapshot 队列。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/repo.ts`  
核心导出：`SqliteSessionRepo`、`SQLITE_STORAGE_VERSION`、`SQLITE_SESSION_EXTENSION`  
被谁调用：宿主；conformance；README。

## 本课目标

这是后端的「目录」。读完应能指出：session id 如何变成文件名、共享容器和一文件一 session 的差异、open 为何校验 path 在仓库内、fork 何时走活 Storage 的 snapshot 队列。

## 文件名

```ts
SAFE_SESSION_FILE_ID = /^[A-Za-z0-9_-]+$/
safe → `${id}.sqlite`
else → `~${base64url(utf16le(id))}.sqlite`
```

UUIDv7 是安全字符。奇怪的 id（路径分隔符、非 ASCII）进编码名，**耐久 id 不变**。list 返回的 metadata.path 是 realpath 后的规范路径。

`databasePath` 若设置：所有 session 一行在同一文件，`pathForSession` 忽略 id。delete 只删行。create 不再 `openFile wx` 占位。

## `pendingIds`

create/open/fork/delete 开头 `reserveId`，已有则 `Session is already open`。成功 open 后 id 仍留在 set 里直到 session close 的 onClose。失败路径 finally delete。这是**进程内**重叠所有权检测，不是文件锁。

## `create`

1. id 默认 `uuidv7(createdAt)`
2. mkdir parent
3. 非共享：`open(path, "wx")` 占空文件，EEXIST 失败
4. `factory.open` + WAL + `applyInitialSchema`
5. 事务：已有行则 throw；`insertSessionRow(..., nextSeq=1)`
6. `openStorageBackedSession`
7. 失败且 reserved 未 initialized：rm db/wal/shm

## `open`

`repositoryPathForMetadata`：`realpath(期望 pathForSession(id))` 必须等于 `realpath(metadata.path)`。防止把别人目录的 metadata 对象拿来打开。然后 `openExisting`（不创建）、读行校验版本、包装 Storage。

## `list`

共享：只读那一个 path。否则 readdir `*.sqlite`。每个文件 openReadOnly，坏文件/无关 sqlite **吞掉**。按 createdAt 降序。ENOENT 目录 → `[]`。

## `delete`

reserve → openExisting → 校验版本 → 共享则事务 `deleteSessionRows`；单文件则校验后 close，`removeSessionFiles({ force: false })`（db 不存在会 throw）。host 必须先 close 打开的 session，否则 pendingIds 已占，delete throw already open。

## `fork`

1. reserve 新 id
2. 若源 (path,id) 在 `openStorages`：`sourceStorage.snapshot(options)` **入源的 commit 队列**；立刻 `.catch(()=>undefined)` 避免未 await 的 rejection
3. 否则 `createForkSnapshotFromExternalSource`：realpath 源 path，只读打开，`BEGIN` 读 entries/scalars，`createForkSnapshot`，COMMIT。注释：外源包括「别的进程正开着的 worker」——快照是这一刻的只读视图，之后源 commit 不会进这份 fork
4. 目标侧与 create 类似：占文件、open、schema、事务插入 session 行 + 所有 entries（Writer + branch 索引）+ scalars + message_count
5. `parentSessionId: source.id`

TODO(WP08)：去掉整图 snapshot，改流式 staging。现在 fork 大 session 会把 entries 全进内存。

同仓库源打开时走活 snapshot，能看到队列里已成功未落盘到「另一个连接」的 commit——其实同一进程同一 db 连接，snapshot 就在那条连接的队列后读。

## `openStorageBackedSession`

`storageIdentity = JSON.stringify([path, sessionId])`。`new SqliteStorage` + `new StorageBackedSession` + `new SqliteOpenSession({ onClose: db.close; 删 map; 释 pendingId })`。

## `close`

标 closed，`allSettled` 每个 open session.close。之后 create 会 `assertOpen` throw。

## 失败与边界

- fork 故意允许 **外国** source.path：只读那文件，不把同 id 的本地打开 session 掉包。文档原句。
- WAL：写连接设 WAL；只读设 busy_timeout。fork 外源 `BEGIN` 不是 IMMEDIATE，只读快照。
- 无跨进程锁。两个进程 create 同一 id：单文件 wx 第二个失败；共享容器事务里 hasSessionRow 第二个 throw。delete 同时 open 靠 pendingIds 只在单进程有效。
- `configureWritableConnection` 每次 open 都 PRAGMA。已是 WAL 的库再设一次无害。

## 下一课

sqlite 子目录门面：[15-sqlite.index.ts.md](/series/pi-source/session-backends/382-sqlite-index-ts/)。
