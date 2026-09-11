---
title: "29 · session/fork.ts — 从源快照构造目标的逻辑状态"
summary: "createForkSnapshot 的输入/输出：源可以声明 entriesComplete: false（后端只给了这一支），tree fork 此时不能信任 tip 都在 map 里。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/fork.ts`  
被谁调用：需要「先在内存里得到目标 entries+values」的路径；MemoryStorage.createFork 内联了类似逻辑。JSONL 大文件走 `jsonl/fork.ts` 流式，不把全部 payload 装进这份 snapshot。

## 本课目标

`createForkSnapshot` 的输入/输出：源可以声明 `entriesComplete: false`（后端只给了这一支），tree fork 此时不能信任 tip 都在 map 里。

## `createForkSnapshot`

1. `validateForkSourceSnapshot`：每个 lane.config/state 必须有对应 branch.tip；tip 与 config/state 必须成对；branch fork 的源必须是配置过的 lane；若 entries 完整（或 tree scope），tip 指向的 entry 必须存在。
2. `selectForkContents`：tree 选全部 entry id；branch 用 `selectBranchFork` 填 entryIds。
3. 投影每个 scalar value，seq 从 `max(copied entry seq)+1` 重新分配给 **投影后的 value 行**（entries 保留原 seq）。
4. 返回 `{ entries, scalarValues, nextSeq }`。

## 失败与边界

这份函数 **不处理 list**（assistant frames 等）。操作态本来就要丢掉，pending lists 不应出现在「当前值」快照里；若源错误地传入 list，调用方需自己滤。Memory 后端的 `createFork` 会投影 list 元素（课 30）。

## 下一课

[30 · in-memory-storage-state.ts](/series/pi-source/agent/271-harness-session-in-memory-storage-state-ts/)：Memory 和 JSONL 共用的内存投影。
