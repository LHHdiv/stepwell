---
title: "06 · session/session-sequences.ts — commit 序号"
summary: "prepareStorageCommit(writes, firstSeq, now) 在 agent-core：给这批 write 分配连续 seq。Storage 负责提供 firstSeq 并在成功后写成 firstSeq + w"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session/session-sequences.ts`（15 行）  
被谁调用：`SqliteStorage.applyCommit`。

## 本课目标

`prepareStorageCommit(writes, firstSeq, now)` 在 agent-core：给这批 write 分配连续 seq。Storage 负责提供 `firstSeq` 并在成功后写成 `firstSeq + writes.length`。

```ts
readNextSeq   → sessions.next_seq
advanceNextSeq → UPDATE ... next_seq = ${nextSeq}，changes 必须为 1
```

两条都在同一 `db.transaction` 里调用，中间插入 entries 使用 prepared 给出的 seq。崩溃回滚则 next_seq 不变。

## 失败与边界

- 关连接后不会调。Storage closed 在队列前就拒绝 commit。
- 不要在事务外单独 advance：会把序号抬走但没行。
- fork 插入的 entries 带着源 seq；新 session 的 next_seq 是 snapshot.nextSeq，后续 commit 接着排。

## 下一课

消息数和 usage 缓存：[07-sqlite.session.session-stats.ts.md](/series/pi-source/session-backends/374-sqlite-session-session-stats-ts/)。
