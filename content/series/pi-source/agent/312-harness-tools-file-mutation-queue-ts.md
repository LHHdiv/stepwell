---
title: "71 · tools/file-mutation-queue.ts — 同一路径的写/改排队"
summary: "并行 toolExecution 时模型可能同时 write 和 edit 同一文件。没有队列会丢更新。read 不进队列（只读）。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/file-mutation-queue.ts`  
被谁调用：write、edit 的 execute。

## 为什么

并行 toolExecution 时模型可能同时 write 和 edit 同一文件。没有队列会丢更新。read 不进队列（只读）。

## 实现

`WeakMap<ExecutionEnv, { queues, registration }>`。key = canonicalPath，not_found/not_supported 则用 absolute。`registration` 链保证「算 key」也串行，避免两个调用对尚未创建的文件算出不同 key。

每个 key 一条 promise 链：等到 currentQueue，跑 fn，finally releaseNext。链尾与 map 中记录相同则 delete，防泄漏。

## 失败与边界

canonical 失败且不是 not_found/not_supported → throw FileError。不同 symlink 指向同一 inode：canonical 成功则同队列；不支持 canonical 的 env 可能并行走两个路径。abort 不取消已排队的前任——只是自己的 fn 开头检查 signal。

## 下一课

[72 · read.ts](/series/pi-source/agent/313-harness-tools-read-ts/)。
