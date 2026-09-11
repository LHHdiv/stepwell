---
title: "storage-targets.ts — 给基准造一个真实的 SqliteStorage 夹具"
summary: "定义存储基准的「被测目标」：用内存 SQLite 打开 WAL 模式、建好 schema、插入一条会话行，再包成 SqliteStorage，并附带释放逻辑。它说明了基准夹具与普通测试夹具的关键差别。"
tags: [pi, session-backends]
---

## 这个文件是什么

`packages/session-backends/sqlite-node/benchmark/session/storage-targets.ts` 定义存储基准的**被测目标（benchmark target）**。

「目标」是 pi 基准体系里的一个概念：一套基准可以同时跑多个实现（比如 SQLite 后端、将来的 Postgres 后端），每个实现提供一份 target，基准框架负责把它们依次跑一遍并对比。这个文件提供的就是 SQLite 这一份。

## 源码解析

### 一、导入与常量（第 1-16 行）

```ts
import { BACKGROUND_CONTEXT } from "@earendil-works/pi-agent-core";
import type { StorageFixture } from "@earendil-works/pi-agent-core/harness/session/testing";
import { createNodeSqliteFactory, SQLITE_STORAGE_VERSION, SqliteStorage, sql } from "../../src/index.ts";
import { applyInitialSchema } from "../../src/sqlite/migrations.ts";
import type { BenchmarkTarget } from "../../../../agent/benchmark/session/benchmark.ts";

const SESSION_ID = "session";
const NOW = 1_700_000_000_000;
const EMPTY_USAGE = {
	input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};
```

这里有一条**跨包依赖方向**的信息值得留意：类型从 `../../../../agent/benchmark/session/benchmark.ts` 导入。也就是说，**基准的框架与类型定义住在 `agent` 包里，而不是本包**。session-backends 只是「填一个实现」。这与前面几章反复出现的分层是同一套逻辑——能力定义在底层，具体实现往上填。

`NOW = 1_700_000_000_000` 是一个写死的时间戳（2023-11-14）。时间被固定，是为了让基准不受当前时钟影响：所有写入行的时间字段完全一致，结果才可复现、可对比。

### 二、夹具工厂（第 18-47 行）

```ts
export const storageBenchmarkTargets = [
	{
		name: "sqlite",
		async createFixture() {
			const db = await createNodeSqliteFactory().open(":memory:");
			try {
				db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
				await applyInitialSchema(db);
```

`name: "sqlite"` 是这份目标在报告里的标识——将来多后端对比时，数字会挂在这个名字下。

`open(":memory:")` 用**内存数据库**而不是磁盘文件。这是基准里刻意的选择：要测的是「SQLite 的写入/读取路径有多快」，不是「你硬盘有多快」。用磁盘会让结果混入文件系统缓存状态、SSD/HDD 差异等噪声，同一台机器重复跑都可能差出数倍。

紧接着两条 PRAGMA：

- `journal_mode = WAL`：预写日志模式。WAL 允许读写并发，是 pi 会话仓库在生产里的实际工作模式，基准必须与之一致，否则测的是另一个东西。
- `busy_timeout = 5000`：锁冲突时最多等 5 秒再报错。多写者并发场景下这条决定「等还是失败」。

**这两行是夹具最容易被忽略、却最影响结果可信度的部分。** 夹具若与生产配置不一致，基准数字就只是这个夹具的数字。

### 三、先插一条会话行，再包成 Storage（第 26-31 行）

```ts
				sql`INSERT INTO sessions
					(id, created_at, parent_session_id, storage_version, metadata, message_count, usage_payload, next_seq)
					VALUES (${SESSION_ID}, ${NOW}, ${null}, ${SQLITE_STORAGE_VERSION}, ${null}, ${0}, ${JSON.stringify(EMPTY_USAGE)}, ${1})`.run(db);
				const storage = new SqliteStorage(db, { sessionId: SESSION_ID, now: () => NOW });
```

注意这里用的是 `` sql`...` `` 标签模板，参数以 `${}` 占位——pi 自己封装的参数化查询写法，避免字符串拼接注入。

必须**先建好 sessions 行**，因为 `SqliteStorage` 的所有操作都挂在某个 session 上（外键关系）。基准测的是「往一个已存在的会话里写消息」，所以夹具要先把那个会话造出来。

`now: () => NOW` 把时间源也注入进去，与上面的常量呼应：**时间可控 = 结果可复现**。

### 四、释放逻辑（第 32-46 行）

```ts
				return {
					storage,
					async [Symbol.asyncDispose]() {
						try {
							await storage.close(BACKGROUND_CONTEXT);
						} finally {
							db.close();
						}
					},
				} satisfies StorageFixture;
			} catch (error) {
				db.close();
				throw error;
			}
		},
	},
] satisfies readonly BenchmarkTarget<StorageFixture>[];
```

三处值得注意：

**`Symbol.asyncDispose`**：夹具不是靠 `afterEach` 清理，而是实现异步释放协议。这样它可以用 `await using fixture = ...` 语法自动释放，清理逻辑跟着对象走，不依赖测试框架的钩子。

**先关 storage 再关 db**，且用 `finally` 保证顺序。若先 `db.close()`，`storage.close()` 会在已关闭的连接上报错。

**catch 分支里也 `db.close()`**：构造中途失败时（比如 schema 迁移报错），连接已经打开，必须回滚式清理，否则内存数据库句柄泄漏。基准往往在循环里反复创建夹具，泄漏会累积并污染后续测量。

## 这个文件与谁协作

- 被 `storage.bench.ts` import，作为 `targets` 传入注册器。
- 它消费 `agent` 包提供的 `StorageFixture` 类型与 `BACKGROUND_CONTEXT`。
- 它与 `session-repo-targets.ts` 是**同构的两份**：一个造 `SqliteStorage`（单会话、内存库），一个造 `SqliteSessionRepo`（多会话、临时目录）。对照读这两份，能看清「存储层」与「仓库层」在夹具上的差别。

## 自查清单

- [ ] 夹具为什么用 `:memory:` 而不是临时文件？这会掩盖哪类真实问题？
- [ ] 两条 PRAGMA 若不设置，基准结果会怎样变化？
- [ ] 为什么必须先插入 sessions 行才能构造 `SqliteStorage`？
- [ ] `Symbol.asyncDispose` 相比在 `afterEach` 里清理，优势在哪？
