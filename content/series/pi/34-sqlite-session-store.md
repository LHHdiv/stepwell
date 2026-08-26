---
title: 第34讲·SQLite 会话仓库
summary: 对话历史不只是一堆文件，而是可查询的结构化数据。pi 用 SessionRepo 抽象 + SQLite 落库，把"会话"变成可检索的仓库。
objectives:
  - 说出 SessionRepo 抽象解决了什么问题（为什么不直接写文件）
  - 指出 pi 的会话仓库基于 SQLite（node:sqlite），而非纯 JSON 文件
  - 把会话仓库与第 24 讲的 SessionManager、第 10 讲的快照 DTO 连起来
tags: [pi, 持久化, SQLite, SessionRepo]
keyPoints:
  - "会话持久化走 SessionRepo 抽象（agent/src/harness/session/types.ts:361），SQLite 只是其中一种实现"
  - "sqlite-node 包提供 SqliteSessionRepo，底层用 Node 22 内置的 node:sqlite（DatabaseSync）落库"
  - "存的不只是聊天文本，而是第 10 讲的 TranscriptItem / SessionSnapshot 这类结构化 DTO"
  - "仓库相比散文件的好处：可检索、可索引、可跨会话聚合，支撑第 24 讲'列出历史会话'"
  - "抽象层让'换存储后端'(JSONL / SQLite / 远端)不影响上层 SessionManager 与 harness"
---

第 24 讲 `SessionManager` 管"有哪些会话、怎么续、怎么分叉"，但没说"会话内容到底存成啥"。这一讲看底层仓库——pi 把对话历史存进 **SQLite**，而不是一堆散文件或一个大 JSON。

## 一、先结论：仓库是一种"可查询的持久化"

核心抽象是 `SessionRepo`，定义在 `packages/agent/src/harness/session/types.ts:361`：

```ts
export interface SessionRepo<Metadata, CreateOptions, ListOptions> {
	// 定义会话如何创建、读取、列出、更新
}
```

`SessionRepo` 把"怎么存"和"存什么"解耦：上层（`SessionManager`、harness）只认这个接口，至于背后是 SQLite、JSONL 文件还是远端数据库，**随便换**。这正是第 24 讲说的"抽象层让部署形态可变"的落地。

pi 自带的实现在 `packages/storage/sqlite-node` 包里——`SqliteSessionRepoApi` 实现 `SessionRepo`，底层用 **Node 22 内置的 `node:sqlite`**（`DatabaseSync`）落库。回忆第 04 讲：pi 要求 Node ≥ 22.19，正是因为这个内置 SQLite 能力。

> **知识拓展**：为什么不上 SQLite 之前要自己造轮子？Node 22 把 `node:sqlite` 纳入标准库，意味着"零额外依赖"就能用上事务安全的嵌入式数据库。pi 踩这个版本线，直接免费拿到了结构化存储。

## 二、存的是什么：结构化 DTO，不是裸文本

仓库里存的不是"用户说：…/ 模型说：…"这种拼好的字符串，而是第 10 讲定义的**结构化 DTO**：

- `TranscriptItem`（`protocol` 包的 `schemas.ts:193`）：对话里的最小单元（一条消息、一次工具调用、一个事件）。
- `SessionSnapshot`（`schemas.ts:241`）：整个会话在某一刻的快照。

把这些 DTO 落进 SQLite 的表，好处是**可检索、可索引**：

- "这个会话里调过几次 `read` 工具？"→ 一条 SQL。
- "上周所有会话总共花了多少 token？"→ 聚合查询。
- "按最后活跃时间列出会话"→ 第 24 讲 `SessionManager.list` 的底层支撑。

对比纯 JSON 文件：要回答同样问题，得把每个文件读进内存手写遍历。仓库化让"会话"从"文本档案"升级成"可分析的数据"。

## 三、为什么不用纯 JSONL

第 24 讲提过 `JsonlSessionRepo`（追加写 JSONL）。那它和 SQLite 仓库矛盾吗？不矛盾——它们是 `SessionRepo` 的**两种实现**，各有场景：

| 实现 | 适合 | 代价 |
|---|---|---|
| JSONL | 简单、可读、易 debug、append-only 不易损坏 | 检索弱、聚合慢 |
| SQLite | 需检索/索引/跨会话聚合 | 多一层 schema 与事务管理 |

pi 把选择权留在 `SessionRepo` 后面：本地快速原型用 JSONL，需要分析/多会话管理用 SQLite。抽象层让切换对上层透明。

## 四、和全系列的咬合

把链路打通：

```
一次对话
  → agent 运行时产出 TranscriptItem（第 10/14 讲）
  → harness 把它汇成 SessionSnapshot（第 18 讲 reduceLaneState）
  → SessionRepo.save 落库（本讲）
  → SessionManager.list 读元数据，UI 展示"可续会话"（第 24 讲）
```

持久化不是孤立的一环，它是"运行时产出 → 结构化 → 可检索"这条数据流水线的终点，也是"下次打开还能续上"的起点。

## 五、试一试

1. 在 `agent/src/harness/session/types.ts:361` 的 `SessionRepo` 里数一数它要求实现哪些方法（Hint：找 `create` / `load` / `list` / `append` 之类）。
2. 打开 `packages/storage/sqlite-node`，确认它是否依赖外部 `better-sqlite3` 还是纯 `node:sqlite`（Hint：看 dist/index.d.ts:1 的 `import { DatabaseSync } from "node:sqlite"`）。
3. 思考：如果改用远端数据库实现 `SessionRepo`，第 25 讲的"信任边界"会有什么新含义？（提示：会话内容也可能含敏感信息，仓库位置也是信任决策。）

## 下一讲预告

会话进了仓库，但一个会话内部还能"分叉"、能"并发跑多条线"。下一讲看持久化模型里的三个一等公民：分支（branch）、泳道（lane）、与快照（snapshot），以及它们如何组合成一段可追溯的时间线。
