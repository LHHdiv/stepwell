---
title: "session-repo-targets.ts — 用临时目录给会话仓库造夹具"
summary: "存储基准的姊妹篇：这一份要造 SqliteSessionRepo，它管理多个会话，所以夹具从内存库换成了 mkdtemp 临时目录，并在释放时递归删除。夹具形态的差别正对应两层抽象的差别。"
tags: [pi, session-backends]
---

## 这个文件是什么

`packages/session-backends/sqlite-node/benchmark/session/session-repo-targets.ts` 定义**会话仓库（SessionRepo）基准**的被测目标。

它与 `storage-targets.ts` 是姊妹文件，结构高度相似。但两者的夹具形态完全不同：那边是内存数据库，这边是临时目录。这个差别不是随手写的，它精确对应了两层抽象的分工。

## 源码解析

### 一、导入（第 1-6 行）

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BACKGROUND_CONTEXT, type SessionRepo } from "@earendil-works/pi-agent-core";
import { createNodeSqliteFactory, SqliteSessionRepo } from "../../src/index.ts";
import type { BenchmarkTarget } from "../../../../agent/benchmark/session/benchmark.ts";
```

比 `storage-targets.ts` 多了三个 Node 内置模块：`mkdtemp`（建唯一临时目录）、`rm`（递归删除）、`join` 与 `tmpdir`（拼路径）。**导入清单已经预告了夹具形态**——读这类文件时，先扫导入，能省下不少猜测。

`rm` 出现在导入里，说明这个夹具必然要清理磁盘痕迹。

### 二、夹具接口（第 8-10 行）

```ts
export interface SessionRepoBenchmarkFixture extends AsyncDisposable {
	readonly repo: SessionRepo;
}
```

这里定义了一个**具名接口**，而 `storage-targets.ts` 是直接用 `satisfies StorageFixture` 复用 agent 包的类型。差异的原因是：`StorageFixture` 由 agent 包提供，而仓库侧的夹具类型在本文件就地定义——因为它需要额外声明 `repo` 字段并组合 `AsyncDisposable`。

`extends AsyncDisposable` 让框架能对它做 `await using`，与存储侧一致。

### 三、夹具工厂（第 12-33 行）

```ts
const NOW = 1_700_000_000_000;

export const sessionRepoBenchmarkTargets = [
	{
		name: "sqlite",
		async createFixture() {
			const directory = await mkdtemp(join(tmpdir(), "pi-sqlite-session-repo-benchmark-"));
			const repo = new SqliteSessionRepo({
				directory,
				databaseFactory: createNodeSqliteFactory(),
				now: () => NOW,
			});
```

**`name: "sqlite"`** 与存储侧同名。这是有意的：两个基准是两套独立报告，各自按目标名分组，同名不会冲突。

**`mkdtemp(join(tmpdir(), "pi-sqlite-session-repo-benchmark-"))`**：`mkdtemp` 在指定前缀后追加随机字符并**创建**目录，返回真实路径。用前缀而非固定路径，是为了让并行运行的多个基准进程互不干扰——固定路径会让两个进程写进同一个库，结果是数据错乱与互相锁表。

**`new SqliteSessionRepo({ directory, databaseFactory, now })`** 三个参数各有分工：

- `directory`：仓库落盘位置。仓库要管理多个会话，每个会话在目录下有自己的库文件，所以它需要的是**目录**而不是单个数据库连接。
- `databaseFactory`：连接工厂。仓库按需开库，工厂负责造连接——这样换用别的 SQLite 驱动（Bun 的 `bun:sqlite`、Node 的 `node:sqlite`）只换工厂。
- `now`：与存储侧同样的固定时钟。

**这与存储侧最关键的区别**：`SqliteStorage` 收的是一个**已打开的 db 与一个 sessionId**，它只服务于那一个会话；`SqliteSessionRepo` 收的是一个**目录与连接工厂**，它要管理会话的创建、列举、删除。夹具形态（内存 db vs 临时目录）只是这个抽象差别的外在表现。

### 四、释放逻辑（第 24-31 行）

```ts
			return {
				repo,
				async [Symbol.asyncDispose]() {
					await repo.close(BACKGROUND_CONTEXT);
					await rm(directory, { recursive: true, force: true });
				},
			};
		},
	},
] satisfies readonly BenchmarkTarget<SessionRepoBenchmarkFixture>[];
```

释放顺序同样是「先关仓库，再删目录」，且这里没有 `try/finally`——因为 `rm` 配了 `force: true`（目录不存在也不报错），`repo.close` 抛错时目录仍可能残留，但临时目录残留不影响后续测量（`mkdtemp` 每次给新目录）。存储侧之所以需要 `finally`，是因为同一个 db 句柄必须关闭以免泄漏。

`recursive: true, force: true` 是删除目录的标准组合：递归删内容，且容忍不存在。缺了 `recursive` 只会报「目录非空」而失败。

## 与存储侧对照读

把两份 targets 并排放，差别一目了然：

| 维度 | storage-targets | session-repo-targets |
|---|---|---|
| 被测类 | `SqliteStorage` | `SqliteSessionRepo` |
| 输入 | 已打开的 db + sessionId | 目录 + 连接工厂 |
| 落盘 | `:memory:`（不落盘） | `mkdtemp` 临时目录 |
| PRAGMA | 显式设 WAL 与 busy_timeout | 不在夹具里设 |
| 类型来源 | 复用 agent 包的 `StorageFixture` | 就地定义接口 |
| 清理 | close storage → close db | close repo → 递归删目录 |

其中**PRAGMA 那一行差异**值得多想一步：存储侧在夹具里手写了 `journal_mode = WAL`，仓库侧没有。因为仓库在开库时自己会应用迁移与 PRAGMA（那是 `SqliteSessionRepo` 的职责），夹具不必重复；而存储侧的夹具直接对裸连接操作，必须自己设。

**夹具该做多少事，取决于被测对象自己做了多少事。** 这是读任何 benchmark 夹具的通用判断标准。

## 自查清单

- [ ] 为什么存储侧用内存库，仓库侧必须用临时目录？
- [ ] `mkdtemp` 为什么要带随机后缀而不能用固定路径？
- [ ] `databaseFactory` 这个参数若不注入、改在内部 new，会失去什么灵活性？
- [ ] 为什么仓库侧的夹具不需要手写 `PRAGMA journal_mode`？
