---
title: "09 · session/values.ts — 标量地址和列表"
summary: "harness 用 Value<T>(namespace, key) 存分支 tip、名字、标签等。列表是另一张表。读完应能指出前缀扫描如何避开 UTF-16 代理区，以及 list 的 cursor 语义。"
tags: [pi, session-backends]
---
源码：`packages/session-backends/sqlite-node/src/sqlite/session/values.ts`  
被谁调用：Storage 的 get/scan/readList 和 commit 的 value/list 分支；fork 拷贝 scalar。

## 本课目标

harness 用 `Value<T>(namespace, key)` 存分支 tip、名字、标签等。列表是另一张表。读完应能指出前缀扫描如何避开 UTF-16 代理区，以及 list 的 cursor 语义。

## scalar upsert

```sql
INSERT ... ON CONFLICT(session_id, namespace, key)
DO UPDATE SET seq = excluded.seq, value = excluded.value
```

后写覆盖。`deleteScalarValueRow` 按地址删。值 `JSON.stringify` / `JSON.parse`。`decodeScalarValueRow` 核对行列与请求地址一致，防止扫错行。

`readAllScalarValueRows` 按 seq 排，fork 要按因果顺序重放。

## 前缀扫描 `scanScalarValueRows`

`key >= prefix.key AND key < nextPrefixBoundary(prefix.key)`。`nextPrefixBoundary`：从末尾找还能 +1 的 code point；落在 surrogate 半区（`0xD800–0xDFFF`）跳到 `0xE000`，避免产出非法 UTF-16 字符串让 SQLite/JS 比较怪异。前缀空或已经是最大码点则无上界，只 `key >= prefix`。

namespace 必须精确匹配，不扫跨 namespace。

`value(namespace, key)` 工厂来自 agent-core，重建 `StoredValue.address`。

## list

`appendListValueRow` 插入 `(namespace, key, seq, json)`。seq 来自 commit 分配，同一 list 多次 append 序号递增。`deleteListValueRows` 删该地址全部元素。

`readListValueRows` 用 `resolveListReadOptions`（core）：默认 limit/order。asc 时 `seq > cursor.seq`，desc 时 `seq < cursor.seq`。没有「包含 cursor 那条」。

## 失败与边界

- JSON 必须能表示 T。`undefined` stringify 成 undefined 会把 SQL 绑定搞砸；core 不允许存 undefined。
- 前缀扫描是字符串序，不是层级。key 设计要用公共前缀。
- list 没有独立 snapshot API；fork 的 `createForkSnapshot` 只带 scalarValues（看 storage.readSnapshot）。列表若要进 fork，得确认 core 的 snapshot 是否包含 list——本 Storage 的 `SqliteStorageSnapshot` 只有 entries + scalarValues。当前 harness fork 依赖的状态在 scalar 和 entries 里。

## 下一课

用量账本：[10-sqlite.session.usage-ledger.ts.md](/series/pi-source/session-backends/377-sqlite-session-usage-ledger-ts/)。
