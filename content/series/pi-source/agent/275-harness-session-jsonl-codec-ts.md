---
title: "34 · jsonl/codec.ts — 只解析文件头，不碰事务行"
summary: "JSON.parse 失败 → Result.err。然后："
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/codec.ts`  
被谁调用：`io.readJsonlHeader`；legacy 检测。

## `parseJsonlSessionHeader(line)`

JSON.parse 失败 → Result.err。然后：

- `isJsonlStorageHeader`：kind=header、v=4、id/cwd 字符串、storageVersion≥1、createdAt≥0 的安全整数，可选字段类型对
- 否则 `isLegacyV3SessionHeader`：type=session、version 恰好 3、timestamp 能 Date.parse、可选 parentSession
- 否则 unsupported

v3 的 timestamp 是 ISO 字符串；v4 的 createdAt 是 epoch ms。不要混。

事务行不在这里 parse（`io.parseJsonlTransaction`）。头认错会导致整文件当 v3 扫一遍或当 v4 replay 失败。

## 失败与边界

header 必须是完整一行（io 还要求 `terminated`）。空文件、只有半行头：io 报 missing/invalid header。

## 下一课

[35 · io.ts](/series/pi-source/agent/276-harness-session-jsonl-io-ts/)：原子发布和撕行。
