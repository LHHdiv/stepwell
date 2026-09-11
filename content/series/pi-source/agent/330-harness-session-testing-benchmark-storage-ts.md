---
title: "benchmark/storage.ts — Storage 后端的确定性性能基准"
summary: "为 Storage 后端提供可复现的性能基准。它把「数据集 / 种子事务生成 / 读写场景」三者拆开，用确定性合成数据（不声称模拟生产分布）对各后端做读写稳态测量，导出供任意基准运行器调用的 seed 与 scenario 函数。"
tags: [pi, agent]
---

## 这个文件是什么

`benchmark/storage.ts` 是 `Storage` 后端的**性能基准（benchmark）**基础设施（`packages/agent/src/harness/session/testing/benchmark/storage.ts`）。它和 `conformance/` 下的「正确性契约」互补：契约测试回答「对不对」，基准测试回答「快不快」。

文件提供三类可复用零件：

1. **种子生成**：`generateStorageBenchmarkSeedTransactions` / `seedStorageBenchmark`——把合成数据集写入存储，得到一份「已预热的稳态」存储。
2. **读场景**：`STORAGE_READ_BENCHMARK_SCENARIOS`——在预热存储上跑只读操作。
3. **写场景**：`STORAGE_WRITE_BENCHMARK_SCENARIOS`——在「每次都从头准备」的存储上跑写操作。

`index.ts:13-18` 把这些符号统一重新导出，供各后端的基准脚本直接 `import`。

> 文件注释特别声明：`Generates deterministic seed transactions without claiming a production data distribution`（`packages/agent/src/harness/session/testing/benchmark/storage.ts:32`）。即数据只是确定性的、便于复现，并不假装贴近真实生产流量分布——基准看重「可横向比较」，而非「贴近现实」。

## 逐段解析

### 导入与基础常量（1-9 行）

```ts
import { BACKGROUND_CONTEXT } from "../../../context.ts";
import { insertEntry, insertUsage } from "../../commit.ts";
import type { MessageEntry, NewEntry, Storage, Write } from "../../types.ts";
import { branchTip, setValue } from "../../values.ts";
import { STORAGE_BENCHMARK_DATASETS, type StorageBenchmarkDataset, storageBenchmarkEntryId } from "./datasets.ts";
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:1-5`）。注意它从 `./datasets.ts` 引入 `STORAGE_BENCHMARK_DATASETS` 与 `storageBenchmarkEntryId`——**数据集的定义在 `datasets.ts`，本文件只消费它**。

```ts
const MESSAGE_TIMESTAMP = 1_650_000_000_000;
const SEED_BATCH_SIZE = 250;
const WRITE_BASELINE_DATASET = STORAGE_BENCHMARK_DATASETS[0]!;
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:7-9`）。`SEED_BATCH_SIZE` 是种子写入的分批大小；`WRITE_BASELINE_DATASET` 取数据集中最小的那份（1k 条目）作为「写基准基线」。

### 合成条目与事务（11-41 行）

```ts
function createEntry(index: number, payloadBytes: number): NewEntry<MessageEntry> {
	const id = storageBenchmarkEntryId(index);
	const prefix = `${id}:`;
	return {
		id,
		parentId: index === 0 ? null : storageBenchmarkEntryId(index - 1),
		type: "message",
		message: {
			role: "user",
			content: [{ type: "text", text: prefix + "x".repeat(Math.max(0, payloadBytes - prefix.length)) }],
			timestamp: MESSAGE_TIMESTAMP,
		},
	};
}
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:11-24`）。每条合成条目是一条 `user` 消息，`id` 由 `storageBenchmarkEntryId(index)` 生成（如 `benchmark-entry-00000000`），`parentId` 指向前一条形成**线性分支**，`text` 用 `x` 填充到指定的 `payloadBytes`。

```ts
function createStorageBenchmarkTransaction(startIndex: number, entryCount: number, payloadBytes: number): Write[] {
	return Array.from({ length: entryCount }, (_, offset) =>
		insertEntry(createEntry(startIndex + offset, payloadBytes)),
	);
}
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:26-30`）。把一组连续条目包成一个 `Write[]` 事务。

```ts
/** Generates deterministic seed transactions without claiming a production data distribution. */
export function* generateStorageBenchmarkSeedTransactions(dataset: StorageBenchmarkDataset): Generator<Write[]> {
	for (let startIndex = 0; startIndex < dataset.entryCount; startIndex += SEED_BATCH_SIZE) {
		yield createStorageBenchmarkTransaction(
			startIndex,
			Math.min(SEED_BATCH_SIZE, dataset.entryCount - startIndex),
			dataset.payloadBytes,
		);
	}
}
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:33-41`）。它是一个**生成器**，按 `SEED_BATCH_SIZE` 把整个数据集切成多个事务批次，供调用方逐批 `commit`。生成器 + 确定性 id 保证了「同一数据集每次产出的事务序列完全一致」。

```ts
/** Seeds one deterministic synthetic linear branch. */
export async function seedStorageBenchmark(storage: Storage, dataset: StorageBenchmarkDataset): Promise<void> {
	for (const transaction of generateStorageBenchmarkSeedTransactions(dataset))
		await storage.commit(transaction, BACKGROUND_CONTEXT);
}
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:44-47`）。`seedStorageBenchmark` 把生成器的每一批事务提交进 `storage`，得到一条 `dataset.entryCount` 条目的线性分支预热存储。它是读场景的「前菜」。

### 场景接口（49-62 行）

```ts
/** A steady-state read operation run against a pre-seeded fixture. */
interface StorageReadBenchmarkScenario {
	readonly name: string;
	expectedResult(dataset: StorageBenchmarkDataset): number;
	run(storage: Storage, dataset: StorageBenchmarkDataset): Promise<number>;
}

/** A write operation run once against each independently prepared fixture. */
interface StorageWriteBenchmarkScenario {
	readonly name: string;
	readonly writeCount: number;
	prepare?(storage: Storage): Promise<void>;
	run(storage: Storage): Promise<number>;
}
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:50-62`）。两个接口的关键差异：

- **读场景**无状态准备，直接在「已播种」存储上读，且必须返回一个 `number`——注释说明 `Returning a number ensures each result is consumed`（`packages/agent/src/harness/session/testing/benchmark/storage.ts:85`），避免引擎把只读结果优化掉（dead-code elimination）导致测了个寂寞。
- **写场景**每次都在「独立准备」的存储上跑一次，`writeCount` 声明本次写了多少条，`prepare?` 是可选预热（如先 seed 基线再追加）。

### 写场景的固定事务与列表（64-83 行）

```ts
const singleEntryTransaction = createStorageBenchmarkTransaction(0, 1, 256);
const hundredEntryTransaction = createStorageBenchmarkTransaction(0, 100, 256);
const appendedEntryId = storageBenchmarkEntryId(WRITE_BASELINE_DATASET.entryCount);
const mixedAppendTransaction: Write[] = [
	...createStorageBenchmarkTransaction(WRITE_BASELINE_DATASET.entryCount, 1, WRITE_BASELINE_DATASET.payloadBytes),
	setValue(branchTip("main"), appendedEntryId),
	insertUsage({ id: "benchmark-usage", entryId: appendedEntryId, adjustment: false, usage: {...} }),
];
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:64-83`）。`mixedAppendTransaction` 是「向基线追加一条消息 + 移动 `branchTip` + 记一笔用量」的混合写，用来衡量「真实写入通常不止一个 store」的开销。

### 读场景清单（86-115 行）

```ts
export const STORAGE_READ_BENCHMARK_SCENARIOS: readonly StorageReadBenchmarkScenario[] = [
	{
		name: "get 100 distributed entries",
		expectedResult(dataset) { return dataset.lookupIds.length; },
		async run(storage, dataset) {
			return (await storage.getEntries([...dataset.lookupIds], BACKGROUND_CONTEXT)).size;
		},
	},
	{
		name: "scan latest 50 entries",
		expectedResult(dataset) { return Math.min(50, dataset.entryCount); },
		async run(storage) {
			return (await storage.scanEntries({ order: "desc", limit: 50 }, BACKGROUND_CONTEXT)).length;
		},
	},
	{
		name: "scan full branch structure",
		expectedResult(dataset) { return dataset.entryCount; },
		async run(storage, dataset) {
			return (await storage.scanBranchStructure({ start: dataset.tipId, order: "newestFirst" }, BACKGROUND_CONTEXT)).length;
		},
	},
];
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:86-115`）。三个读场景分别测「按 id 批量取分散条目」「按全局序扫描最新 50 条」「扫描整条分支结构」，且都返回 `number` 以保活结果。`expectedResult` 提供「理论上应返回多少」的校验值，供基准运行器做正确性旁路检查。

### 写场景清单（118-143 行）

```ts
export const STORAGE_WRITE_BENCHMARK_SCENARIOS: readonly StorageWriteBenchmarkScenario[] = [
	{ name: "commit one message entry", writeCount: 1, async run(storage) { return (await storage.commit(singleEntryTransaction, BACKGROUND_CONTEXT)).seqs.length; } },
	{ name: "commit 100 message entries", writeCount: 100, async run(storage) { return (await storage.commit(hundredEntryTransaction, BACKGROUND_CONTEXT)).seqs.length; } },
	{ name: `commit mixed append (${WRITE_BASELINE_DATASET.name})`, writeCount: 3, prepare(storage) { return seedStorageBenchmark(storage, WRITE_BASELINE_DATASET); }, async run(storage) { return (await storage.commit(mixedAppendTransaction, BACKGROUND_CONTEXT)).seqs.length; } },
];
```

（`packages/agent/src/harness/session/testing/benchmark/storage.ts:118-143`）。三个写场景：单条提交、百条提交、以及「先 seed 基线再混合追加」。每个 `run` 都返回 `seqs.length` 即实际写入条数，供运行器核对 `writeCount` 是否被忠实执行。

## 它解决什么问题 / 为什么这样设计

不同 `Storage` 后端（Memory / JSONL / SQLite）的性能特征差异巨大，若各自手写基准则规模、预热、计时口径都不统一、无法横向比较。本文件把「数据怎么造、怎么预热、测哪些操作」统一成确定性共享清单：**确定性**（生成器 + 固定 id/时间戳，任何后端吃到的输入一致）、**读写分离**（读场景在预热存储上跑、写场景每次独立准备，互不污染）、**运行器无关**（场景是普通函数，可用 `performance.now()` 或自研循环任意计时，不绑定框架）。

## 谁调用它 / 它调用谁

- **调用者**：各后端的基准脚本 `import` 本文件的 `seedStorageBenchmark`、`STORAGE_READ_BENCHMARK_SCENARIOS`、`STORAGE_WRITE_BENCHMARK_SCENARIOS`（`index.ts:13-18`），在外层循环中驱动计时。
- **被调用者**：消费 `datasets.ts` 的数据集与 `storageBenchmarkEntryId`；调用 `commit.ts` 的 `insertEntry/insertUsage`、`values.ts` 的 `branchTip/setValue`、`context.ts` 的 `BACKGROUND_CONTEXT`。

## 与同目录其他文件的关系

- `datasets.ts` 只负责「有什么数据」（规模/条数/采样 id），本文件负责「怎么用数据造事务和场景」——职责清晰分离。
- 兄弟文件 `benchmark/session-repo.ts` 是同一思想在 `SessionRepo` 层（目录、fork）的基准，且**复用本文件的 `generateStorageBenchmarkSeedTransactions`** 来播种源会话（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:5`）。

## 自查清单

- [ ] `generateStorageBenchmarkSeedTransactions` 为什么是生成器（generator）而非直接返回数组？
- [ ] 读场景的 `run` 为什么必须返回 `number`，而不仅是执行读操作？
- [ ] `seedStorageBenchmark` 与写场景里 `mixedAppendTransaction` 的 `prepare` 各自扮演什么角色？
- [ ] 本文件自身定义了数据集吗？数据集来自哪个文件？
