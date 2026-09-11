---
title: "33 · jsonl/types.ts — 文件头与仓库选项"
summary: "JSONLFORMATVERSION = 4：行格式（header.kind === \"header\"）。JSONLSTORAGEVERSION = 1：语义版本，打开时必须相等，否则 throw unsupported。规范 R11："
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/types.ts`

## 版本

`JSONL_FORMAT_VERSION = 4`：行格式（header.kind === "header"）。`JSONL_STORAGE_VERSION = 1`：语义版本，打开时必须相等，否则 throw unsupported。规范 R11：迁移机制有规格，当前没有实际 migration。

## `JsonlStorageHeader`

`v, kind: "header", id, storageVersion, createdAt, cwd`，可选 parentSessionId、legacyParentSessionPath、`nextSeq`（快照重写后的高水位）。

v3 遗留头是另一形状（`type: "session", version: 3, timestamp: ISO 字符串`），见 codec。

## metadata / options

`JsonlSessionMetadata` 在 SessionMetadata 上加 `cwd`、`path`、`modifiedAt`（文件 mtime，给 list 排序/展示）。

create 必须给 cwd。list 可按 cwd 过滤。repo 选项：`fileSystem`、`sessionsRoot`、可选 `now`。

## 下一课

[34 · codec.ts](/series/pi-source/agent/275-harness-session-jsonl-codec-ts/)：如何认第一行是 v3 还是 v4。
