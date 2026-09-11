---
title: "benchmark/datasets.ts — 基准用的确定性合成数据集"
summary: "只有 33 行的基准数据层。它定义了 Storage 基准的数据集结构 StorageBenchmarkDataset，提供包内共享的确定性条目 id 生成函数 storageBenchmarkEntryId，并导出 1k / 10k / 100k 三条线性分支的合成数据集。它只描述「有什么数据」，如何把数据变成事务与场景由 storage.ts 负责。"
tags: [pi, agent]
---

## 这个文件是什么

`benchmark/datasets.ts` 是 benchmark 套件的**数据层**（`packages/agent/src/harness/session/testing/benchmark/datasets.ts`），全文仅 33 行。它只做一件事：定义「基准用什么规模的合成数据」，而不关心这些数据怎么被写入或被测量。这种「数据与场景分离」的边界，让它能被 `benchmark/storage.ts` 与 `benchmark/session-repo.ts` 共同消费。

它导出三部分：

1. `StorageBenchmarkDataset` 接口——描述一份数据集的元数据。
2. `storageBenchmarkEntryId`——包内共享的确定性条目 id 生成函数。
3. `STORAGE_BENCHMARK_DATASETS`——三档规模的合成数据集常量。

## 逐段解析

### 数据集接口（1-7 行）

```ts
export interface StorageBenchmarkDataset {
	readonly name: string;
	readonly entryCount: number;
	readonly payloadBytes: number;
	readonly lookupIds: readonly string[];
	readonly tipId: string;
}
```

`packages/agent/src/harness/session/testing/benchmark/datasets.ts:1-7`。一份数据集用五个字段描述：

- `name`：人类可读的规模名（如 `synthetic linear branch: 1k entries, 256-byte payloads`）。
- `entryCount`：线性分支的条目总数。
- `payloadBytes`：每条目负载字节数（本文件统一 256）。
- `lookupIds`：一组**分散采样**的条目 id，供读基准「按 id 批量取分散条目」使用。
- `tipId`：分支末端的条目 id，供「扫描整条分支结构」类读场景作为起点。

### 共享 id 生成器（9-12 行）

```ts
/** Package-internal deterministic id shared by dataset and transaction generation. */
export function storageBenchmarkEntryId(index: number): string {
	return `benchmark-entry-${index.toString().padStart(8, "0")}`;
}
```

`packages/agent/src/harness/session/testing/benchmark/datasets.ts:10-12`。这是**包内共享**的确定性 id 工厂：把数字索引格式化为 8 位零填充的 `benchmark-entry-00000000`。它的确定性至关重要——数据集的 `lookupIds`/`tipId` 与 `storage.ts` 里构造事务时用的 id 必须来自同一个函数，否则读写两端对不上号。这正是一条「数据集与事务生成共享同一 id 空间」的隐式契约。

### 数据集构造（14-26 行）

```ts
function createDataset(scale: string, entryCount: number): StorageBenchmarkDataset {
	const lookupCount = Math.min(100, entryCount);
	return {
		name: `synthetic linear branch: ${scale}, 256-byte payloads`,
		entryCount,
		payloadBytes: 256,
		lookupIds: Array.from({ length: lookupCount }, (_, index) => {
			const entryIndex = Math.floor((index * (entryCount - 1)) / Math.max(1, lookupCount - 1));
			return storageBenchmarkEntryId(entryIndex);
		}),
		tipId: storageBenchmarkEntryId(entryCount - 1),
	};
}
```

`packages/agent/src/harness/session/testing/benchmark/datasets.ts:14-26`。`createDataset` 做两件事：

- 取 `Math.min(100, entryCount)` 条作为采样数（规模小于 100 时全取，否则固定 100 条），并把它们在 `[0, entryCount-1]` 区间**均匀分布**（`entryIndex = floor(index*(entryCount-1)/(lookupCount-1))`），保证 `lookupIds` 覆盖整条分支而非集中头部。
- `tipId` 直接是最后一条（`entryCount-1`）的 id。

### 三档数据集（28-33 行）

```ts
/** Deterministic synthetic linear branches shared by all storage measurements. */
export const STORAGE_BENCHMARK_DATASETS: readonly StorageBenchmarkDataset[] = [
	createDataset("1k entries", 1_000),
	createDataset("10k entries", 10_000),
	createDataset("100k entries", 100_000),
];
```

`packages/agent/src/harness/session/testing/benchmark/datasets.ts:29-33`。最终导出三档：`1k` / `10k` / `100k` 条、统一 256 字节负载、确定性线性分支。注释强调它们是「deterministic synthetic」，即仅供复现，不声称模拟生产分布。

## 它解决什么问题 / 为什么这样设计

基准最怕「不可复现」与「口径不一」。本文件的职责边界非常克制：

1. **单一数据真相源**：所有后端、所有场景都从这三档数据集取数，规模与采样方式完全统一。
2. **确定性 id 空间**：`storageBenchmarkEntryId` 让「数据集声明」与「事务构造」共用同一套 id，读写两端天然对齐。
3. **纯描述、不执行**：文件不产生任何存储操作，因此可安全被 `storage.ts` 与 `session-repo.ts` 双向引用，不会引入循环副作用。

> 注意：本文件并不定义「怎么写入」或「测哪些操作」——那是 `benchmark/storage.ts`（`generateStorageBenchmarkSeedTransactions`/`seedStorageBenchmark`、读/写场景）与 `benchmark/session-repo.ts`（fork 播种）的职责。datasets 只回答「数据长什么样」。

## 谁调用它 / 它调用谁

- **调用者**：
  - `benchmark/storage.ts:5` 导入 `STORAGE_BENCHMARK_DATASETS` 与 `storageBenchmarkEntryId`，用于构造种子事务与读/写场景（`index.ts:14-18` 也把 `STORAGE_BENCHMARK_DATASETS` 重新导出）。
  - `benchmark/session-repo.ts:4` 导入 `STORAGE_BENCHMARK_DATASETS` 与 `StorageBenchmarkDataset` 类型，作为 fork 基准的「源会话大小」（1k / 10k 两档，`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:130-133`）。
- **被调用者**：本文件不依赖任何兄弟模块，是 benchmark 目录的依赖叶子（leaf），只用到标准 `Array.from`/`Math`。

## 与同目录其他文件的关系

- 与 `benchmark/storage.ts` 是「数据 → 用法」关系：storage.ts 消费本文件的 `STORAGE_BENCHMARK_DATASETS` 与 `storageBenchmarkEntryId`，把条目数变成线性分支事务。
- 与 `benchmark/session-repo.ts` 是「数据 → 用法」关系：session-repo.ts 复用同一数据集作为 fork 源规模，并复用 storage.ts 的写入逻辑（最终仍是本文件的 id 空间）。
- 它本身不参与 `conformance/` 的正确性契约，也不使用 `gating-storage.ts` 等故障注入装饰器——纯粹是性能测量的输入。

## 自查清单

- [ ] `StorageBenchmarkDataset` 的五个字段分别描述数据集的什么？
- [ ] `storageBenchmarkEntryId` 为什么必须是「包内共享」而非各文件各写一份？
- [ ] `lookupIds` 的采样为什么用「均匀分布在整条分支」而非简单取前 100 条？
- [ ] 本文件是否包含任何真实的存储写入或计时逻辑？
