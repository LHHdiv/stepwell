---
title: "31 · session/memory.ts — 进程内仓库，server 测试的默认后端"
summary: "看三层：MemoryStorage（commit 队列）、MemorySessionFacade（关会话时拒绝新工作但仍排空已 admit 的）、MemorySessionRepo（create/open/fork 的所有权）。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/memory.ts`  
被谁调用：`packages/server` 的 MemorySessionRepo；harness 单测。

## 本课目标

看三层：`MemoryStorage`（commit 队列）、`MemorySessionFacade`（关会话时拒绝新工作但仍排空已 admit 的）、`MemorySessionRepo`（create/open/fork 的所有权）。

## `MemoryStorage`

commit 串在 `commitQueue` 上，关闭后 reject。查询在 open 时同步读 `storageState`。`fork()` 等当前 queue 空，然后 `storageState.createFork`。close 等 queue 结束。

## `MemorySessionFacade`

包装 `StorageBackedSession`。每个 beginMutation 把一个 `finished` promise 放进 `admitted` 集合。close：state=closing，等所有 admitted settle，再 session.close，调 onClose。closing 期间新的 admit 失败。这比裸 Session 更严：server 需要「会话工人要下班时，把已经开始的 mutate 做完」。

## `MemorySessionRepo`

`records: Map<id, MemorySessionRecord>`。create 分配 uuidv7（或给定 id）、storageVersion=1。open 时 `open: true`，重复 open throw。delete 要求未打开。fork：源必须已 create 过；若源正打开，从 **当前** MemoryStorage.fork() 在 commit 边界取快照；未打开则对存储直接 fork。目标 metadata.parentSessionId = 源 id。

list 返回 metadata 数组。repo 没有 cwd 概念——那是 JSONL 的目录布局。

## 失败与边界

进程一死，Memory 会话全没。这就是为什么生产会话 worker 用 JSONL（或未来 SQLite），server 单测用 Memory。

同一 id 不能双开：规范「一个可写 Session 同一时刻一个 owner」。Memory 用 `open` 布尔模拟，不靠文件锁。

## 下一课

JSONL：[32 · jsonl/index.ts](/series/pi-source/agent/273-harness-session-jsonl-index-ts/)。
