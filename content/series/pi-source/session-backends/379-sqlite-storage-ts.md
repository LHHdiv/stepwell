---
title: "12 · storage.ts — `SqliteStorage` 实现 harness `Storage`"
summary: "对照 Storage 接口逐方法。重点：commit 队列、prepareStorageCommit、事务里四种 write、snapshot 如何复用同一队列以便同进程 fork 看到已提交状态。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/storage.ts`  
核心导出：`SqliteStorage`、`SqliteStorageSnapshot`  
被谁调用：Repo `openStorageBackedSession`；conformance 直接 `new SqliteStorage(db, { sessionId })`。

## 本课目标

对照 `Storage` 接口逐方法。重点：commit 队列、`prepareStorageCommit`、事务里四种 write、snapshot 如何复用同一队列以便同进程 fork 看到已提交状态。

## 生命周期

`state: open | closing | closed`。`commit` 在非 open throw。读方法 `Promise.reject("closed")`。`close` 等 `commitQueue` 排空再标 closed，**不**关 Database——连接所有权在 Repo 的 `SqliteOpenSession.onClose`。

## commit 队列

```ts
const result = this.commitQueue.then(() => this.applyCommit(writes));
this.commitQueue = result.then(() => undefined, () => undefined);
return result;
```

失败也继续队列（swallow 到 tail），下次 commit 仍跑。调用方 await 的那份 Promise 仍 reject。这与 SessionRouter 的 clientOperations 同构。snapshot 同样入队，保证 fork 读到队列前的所有成功 commit。

## `applyCommit`

`db.transaction(() => { ... })` 同步：

1. `firstSeq = readNextSeq`
2. `prepareStorageCommit(writes, firstSeq, now())` — core 填 seq/timestamp、展开成带 `kind` 的写集
3. switch：
   - `entry`：Writer.insert + branch 索引；message 则 +1 count
   - `usage`：Writer.insert + addUsageToSessionStats
   - `value`：delete 或 setScalar
   - `list`：delete 或 append
4. `advanceNextSeq(firstSeq + prepared.writes.length)`
5. 返回 `{ ...prepared.result, stats: readSessionStats }`

触发器失败 → transaction catch ROLLBACK → 整笔 commit reject。

`now` 可注入，测试时间确定。

## 读路径

全部先查 `state === "open"`。同步 SQL 包成 Promise（有的 `Promise.resolve().then(() => scan...)` 为了把 throw 变成 rejection）。`getEntries` 保持请求 id 的循环顺序只放入存在的行。

`scanBranch` 把 `StorageBranchScan` 原样交给 branch-entries。

## snapshot

`readSnapshot`：

- 总是读全部 scalar
- `scope === "tree"`：全部 entries，`entriesComplete: true`
- 否则：找 `branchTip(options.branch)` 对应 scalar（tip id 或 null）。未知分支 throw。tip null → 空 entries。否则 `scanBranchEntries({ start: tip, order: "oldestFirst" })`，`entriesComplete: false`（这段不是整棵树）

`createForkSnapshot`（core）再用这份做裁剪。Repo 同进程 fork 调 `storage.snapshot`；跨进程走只读连接自己读表。

## 失败与边界

- 不实现 Storage 以外的方法。没有 search。
- 单 `SqliteStorage` 对应 (path, sessionId)。共享容器里两个 session 两个 Storage 两个队列，SQLite 锁在 IMMEDIATE 事务上串行化写。
- close 不拒绝已经入队的 commit：closing 后队列里的 applyCommit 仍跑完。新的 commit 在 state!==open 时拒绝。close 等队列。

## 下一课

包一层 Session，关库：[13-sqlite.session.ts.md](/series/pi-source/session-backends/380-sqlite-session-ts/)。
