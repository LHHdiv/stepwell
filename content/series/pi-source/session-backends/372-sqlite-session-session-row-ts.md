---
title: "05 · session/session-row.ts — 容器里的 Session 行"
summary: "SessionMetadata（agent-core）加上 path：物理容器路径。list/open 必须带回这份 path，fork 外源快照才能 openReadOnly(source.path)。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session/session-row.ts`  
核心导出：`SqliteSessionMetadata`、`insertSessionRow`、`metadataFromSessionRow`、`deleteSessionRows`  
被谁调用：Repo 的 create/open/list/delete/fork。

## 本课目标

`SessionMetadata`（agent-core）加上 `path`：物理容器路径。list/open 必须带回这份 path，fork 外源快照才能 `openReadOnly(source.path)`。

## 版本闸

```ts
if (row.storage_version > current) throw newer than ...
if (row.storage_version < current) throw requires migrations
```

严格相等才继续。没有「打开只读忽略小版本」。共享容器里混了新版本行，list 的 try/catch 会跳过整个文件（Repo list 是 best-effort）。

## `insertSessionRow`

message_count=0，usage 全 0 JSON，metadata 列 null，next_seq 由调用方传入（create 用 1，fork 用 snapshot.nextSeq）。`parentSessionId` 缺省绑 SQL null。

`zeroUsage` 必须带 `cost` 子对象，形状与 pi-ai `Usage` 对齐，否则 `getStats` JSON.parse 后加减会炸。

## `deleteSessionRows`

按 session_id 删 6 张子表再删 sessions。检查 `changes === 1`。共享容器 delete 走这条，文件还在。单文件 repo 则删完行后 `rm` 三个文件（db/wal/shm）。

没有 FK ON DELETE CASCADE。顺序手写，避免触发器在删 entries 时找 parent。触发器只在 INSERT。

## 失败与边界

- `readSessionRow` 找不到 → `Unknown SQLite session`。open 缺失 id 但文件在（共享容器）走这里。
- `hasSessionRow` 给 create/fork 事务内查重。
- metadata 列目前未用。将来的 cwd 等不要误写进 usage_payload。

## 下一课

next_seq：[06-sqlite.session.session-sequences.ts.md](/series/pi-source/session-backends/373-sqlite-session-session-sequences-ts/)。
