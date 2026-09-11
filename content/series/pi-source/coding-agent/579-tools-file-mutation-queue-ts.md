---
title: "62 · file-mutation-queue.ts — 同文件写操作串行"
summary: "agent-loop 并行批会同时 execute 两个工具。同 inode 的写必须排队。不同文件仍并行。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/file-mutation-queue.ts`  
被谁调用：write、edit 的 execute。

## 本课目标

agent-loop 并行批会同时 `execute` 两个工具。同 inode 的写必须排队。不同文件仍并行。

实现：模块级 `Map<key, Promise<void>>`。key = `realpath`，ENOENT/ENOTDIR 则用 `path.resolve`（新文件还没有 inode）。`registrationQueue` 保证「算 key + 挂到链上」本身也串行，避免两个新文件抢同一个 resolved path 时丢链。

`withFileMutationQueue(path, fn)`：等当前链，跑 fn，finally 放行下一棒，链尾则 delete map 项。

## 和 executeToolCalls 的关系

这是工具层的锁，不是 loop 的 sequential 模式。read/bash 不进队。abort 时 write/edit 故意不在 abort listener 里 reject，就是怕 finally 提前 releaseNext，下一个 edit 读到半写入文件。

进程级 Map，多 AgentSession 同进程会共享（通常只有一个）。

## 下一课

[63-tools-output-accumulator.ts.md](/series/pi-source/coding-agent/581-tools-output-accumulator-ts/)。
