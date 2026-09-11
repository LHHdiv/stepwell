---
title: "35 · jsonl/io.ts — 一行一事务，rename 才算发布"
summary: "FileSystem 的 Result → throw Error（带 cause）。JSONL 后端选择「存储 API throw」，与 ExecutionEnv「永不 throw」相反。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/io.ts`  
被谁调用：JsonlStorage create/open/upgrade；jsonl fork。

## `fileValue`

FileSystem 的 Result → throw Error（带 cause）。JSONL 后端选择「存储 API throw」，与 ExecutionEnv「永不 throw」相反。

## 头与事务

`readJsonlHeader`：第一行必须存在、`terminated`、非空，再交给 codec。

`parseJsonlTransaction`：JSON 数组或单对象，每项 `parseCommittedWrite`（检查 seq 为 ≥1 的安全整数，kind 分派）。**不**深校验 entry.message 形状——损坏的会话不受支持。

`serializeJsonlTransaction`：单条 write 写成对象，多条写成数组。省一对括号，replay 时两者都认。

## 原子发布

`publishFileAtomically`：写 `dest.tmp`，回调里多次 append，成功则 `renameFile` 覆盖 dest；失败 `remove` tmp。rename 在 POSIX 上替换是原子的。跨文件系统 rename 合同写在 FileSystem 上「不拷贝」——JSONL 的 tmp 与 dest 同目录。

`publishJsonl`：先写 header 行，再让回调 `append(writes)` 成行。

## 失败与边界

崩溃在 rename 前：dest 仍是旧文件，tmp 可能残留，下次 create/fork 应 force remove。崩溃在 append 一条新事务之后：open 时若最后一行无 `\n`（torn），storage 会 **重写去掉撕行**（课 36）——那半条事务从未 apply。

## 下一课

[36 · jsonl/storage.ts](/series/pi-source/agent/277-harness-session-jsonl-storage-ts/)。
