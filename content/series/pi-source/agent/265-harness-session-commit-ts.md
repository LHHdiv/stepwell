---
title: "24 · session/commit.ts — 一次事务里的序号与校验"
summary: "理解 seq 是 事务内按写入顺序严格递增 的全局序号，不是 entry 树深度。parent 必须已存在或在本事务更早的 write 里。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/commit.ts`  
被谁调用：`InMemoryStorageState.prepareCommit`；JSONL serialize 前。

## 本课目标

理解 seq 是 **事务内按写入顺序严格递增** 的全局序号，不是 entry 树深度。parent 必须已存在或在本事务更早的 write 里。

## `insertEntry` / `insertUsage`

把 NewEntry / usage row 包成 Write。真正的 seq/timestamp 在 `commitWrite`：

- entry：展开 NewEntry，加上 seq、timestamp
- usage：展开 row，加上 seq（usage 没有自己的 timestamp 字段）
- value/list：拷贝 op + 加上 seq

`prepareStorageCommit(writes, firstSeq, timestamp)`：第 i 条 seq = firstSeq + i。返回 `PreparedCommit`（还没有 stats；stats 在 apply 后由 storage 填）。

## `validateCommittedWrites`

- seq 必须 `> previousSeq`（允许空隙？不允许：循环里 `<= previousSeq` 就炸，而 prepare 给的是连续的，所以连续递增）
- entry/usage id 不得与已有或本事务重复
- entry.parentId 若非 null，必须已在存储或本事务更早的 entry 里

不在这里校验「value 的 JSON 形状」——内部对象受信任。

## 失败与边界

校验失败应让 **整笔** commit throw，apply 不得发生。Memory/JSONL 都是 prepare（含 validate）成功才 apply。JSONL 若 append 成功、进程在 apply 前死：重开会 replay 那一行，apply 一次——这就是「先落盘再内存」的顺序（课 36）。

## 下一课

[25 · mutation-line.ts](/series/pi-source/agent/266-harness-session-mutation-line-ts/)：Session 层把 commit 再串成一条队列。
