---
title: "08 · search/index.ts — 会话搜索的类型桩，规范标未实现"
summary: "不要把这份 27 行当成搜索引擎。记下查询形状，知道现在没有任何 searchSessions 实现绑定到 JSONL / Memory。"
tags: [pi, agent]
---
源码：`packages/agent/src/search/index.ts`  
被谁调用：`src/index.ts` `export *`。规范 `docs/harness.md` §0.9 **S3**：设计已有，当前骨架与设计冲突，没有实现。

## 本课目标

不要把这份 27 行当成搜索引擎。记下查询形状，知道现在没有任何 `searchSessions` 实现绑定到 JSONL / Memory。

## 类型

`SearchQuery`：`text` + 可选 `limit`。

`SessionSearchHit`：命中哪个 `sessionId`，可选 `score`，可选 `top`（一条 entry 的 id / snippet / timestamp）。

`EntrySearchHit`：精确到 entry。

`SessionSearchService`：

| 方法 | 含义 |
|---|---|
| `searchSessions` | 按会话打分 |
| `searchEntries?` | 可选，搜条目 |
| `sync` | 全量/增量建索引 |
| `notify(sessionId)` | 某会话变了，稍后索引 |
| `remove` | 会话删除时清索引 |
| `close` | 释放 |

这是给「仓库外面的搜索投影」预留的。规范强调：搜索索引可重建，没有权威。权威在 entries / values / usage ledger。

## 失败与边界

现在调用这些方法会找不到实现类。不要在产品路径上 `new` 一个假服务。JSONL repo 的 `list` 只扫目录头，不做全文检索。

## 下一课

主链类型读完。下一包若跟 CLI：去 `packages/ai` 的 `streamSimple`，或 coding-agent `core/tools/read.ts`。

若读可恢复运行时：[09 · agent-harness.ts](/series/pi-source/agent/250-harness-agent-harness-ts/)。
