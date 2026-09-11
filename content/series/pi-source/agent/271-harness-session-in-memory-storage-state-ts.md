---
title: "30 · in-memory-storage-state.ts — Memory 与 JSONL 共用的内存权威"
summary: "注释写明：这份状态 不适合 数据库后端和放不进内存的长会话。SQLite 后端应在事务里更新索引聚合。现在两个已实现后端都是「整份会话在进程里」。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/in-memory-storage-state.ts`  
被谁调用：`MemoryStorage`；`JsonlStorage` 打开时 replay 进这份，之后查询都打内存。

## 本课目标

注释写明：这份状态 **不适合** 数据库后端和放不进内存的长会话。SQLite 后端应在事务里更新索引聚合。现在两个已实现后端都是「整份会话在进程里」。

## 结构

- `entries` Map + `entriesBySeq` 数组（按插入序，即 seq 序）
- `scalarValues` / `listValues`：key 为 `namespace + \0 + key`
- `usage` Map
- `stats`：messageCount + 累加 Usage
- `nextSeq` 从 1 起

`compareKeys` 按 code point 比较，给 scanValues 一个稳定序。

## 写路径

`prepareCommit` → `prepareStorageCommit` + `validateCommitted`。`applyValidated` 假定已校验：

- entry：进 map 和 bySeq；message 则 messageCount++
- usage：进 map，stats.usage 用 `addUsage`
- value delete / list delete：整 key 去掉
- set/append：`applyValueSetOrListAppend`

每条 write 后 `nextSeq = write.seq + 1`。

## 读路径

`getEntries`、`getValue`、`scanValues`（前缀匹配 namespace+key）、`readList`（cursor/order/limit）、`scanBranch` 沿 parent 走，`scanEntries`/`scanUsage` 按 seq 过滤。`scanBranchStructure` 只返回结构字段。

## `createFork`

按 fork-policy 选 entry；投影 scalar 和 **每个 list 元素**；`destination.nextSeq = this.nextSeq`（保留高水位，不压缩序号——规范 J1：死字节不回收）。usage 不拷，所以 destination.stats.usage 仍是 empty。

## 失败与边界

`advanceNextSeq` 给 JSONL header.nextSeq 用：快照重写后文件里没有旧事务，但序号不能回头。validate 用 `hasEntryOrUsageId` 防止 id 跨两个 store 碰撞。

## 下一课

[31 · memory.ts](/series/pi-source/agent/272-harness-session-memory-ts/)：Repo + 关会话时的门面。
