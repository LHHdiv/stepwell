---
title: "36 · jsonl/storage.ts — 打开即 replay，commit 先 append 再 apply"
summary: "create：内存 prepare 初始 writes，publishJsonl 写出头+事务，再 apply。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/storage.ts`  
实现 `Storage`。查询全部打 `InMemoryStorageState`。

## 打开

`create`：内存 prepare 初始 writes，`publishJsonl` 写出头+事务，再 apply。

`open`：先只读头（line reader），v3 走 `LegacyV3Source.read`；v4 读全文 `splitCompleteLines`：

- 不以 `\n` 结尾 → torn=true，最后半行丢掉
- 从第 2 行起 `parseJsonlTransaction` + `replayCommitted`（validate+apply）
- 一行失败 → throw，带行号
- `header.nextSeq` 若有，`advanceNextSeq`
- torn 则原子重写「完整行 + 末尾换行」，修掉撕行

v3 backing 保持 `kind: "v3"` 直到第一次 **非空** commit。

## commit

串行 `commitQueue`。v3 且 writes 非空：`upgradeLegacyV3ToV4`——把 v3 全部规范化 writes 重写成 v4 文件，并插入一条 `adjustment: true` 的 usage（`details.source = "v3-import"`）再跟上 caller writes。原子 publish。之后 backing = v4。

v4：prepare → `appendFile` 一行 JSON → apply。**先磁盘后内存**：append 失败则内存未变；append 成功、apply 前崩溃 → 重开 replay 会 apply。这是崩溃安全的核心顺序。

空 writes：仍走 prepare/apply（可能只推进 timestamp？prepare 对空数组 firstSeq 不变），不 append。

`withImportedUsage`：v3 导入的 usage 要算进 getStats，即使那条 adjustment 行在升级事务里。

## 失败与边界

规范 J1：没有快照压缩，文件只 append，deleteValue 不会缩小文件。fork 是少数「重写新文件」的路径。

同一 path 双开：repo 层用 map 挡住，Storage 自己不管文件锁。

## 下一课

[37 · jsonl/repo.ts](/series/pi-source/agent/278-harness-session-jsonl-repo-ts/)：目录布局与所有权。
