---
title: "benchmark/session-repo.ts — SessionRepo 的目录与分叉基准"
summary: "为 SessionRepo 后端提供两类性能基准：一是「目录」操作（列出/创建/打开/删除会话），二是「分叉」操作（从已播种的源会话 fork 出目标）。它通过确定性数据集与独立准备的仓库，让各后端在统一口径下比较会话管理的开销。"
tags: [pi, agent]
---

## 这个文件是什么

`benchmark/session-repo.ts` 是 `SessionRepo` 接口（`packages/agent/src/harness/session/types.ts:592`）的性能基准基础设施（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts`）。它与 `benchmark/storage.ts` 同一思路，但作用在更高层的「会话仓库」上，覆盖两类操作：

1. **目录（catalog）基准**：创建/列出/打开/删除会话这类仓库级元数据操作。
2. **分叉（fork）基准**：从一个已播种的源会话 fork 出目标会话。

文件复用 `benchmark/datasets.ts` 的存储数据集与 `benchmark/storage.ts` 的种子事务生成器，避免重复造数据。`index.ts:2-12` 把这些符号统一导出。

## 逐段解析

### 导入与共享 id（1-40 行）

```ts
import { BACKGROUND_CONTEXT } from "../../../context.ts";
import type { SessionMetadata, SessionRepo } from "../../types.ts";
import { branchTip, laneConfig, laneState, setValue } from "../../values.ts";
import { STORAGE_BENCHMARK_DATASETS, type StorageBenchmarkDataset } from "./datasets.ts";
import { generateStorageBenchmarkSeedTransactions } from "./storage.ts";
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:1-5`）。注意它**跨文件复用** `storage.ts` 的 `generateStorageBenchmarkSeedTransactions`——分叉基准的源会话正是用它来播种线性分支。

```ts
/** Package-internal deterministic session id shared by repository benchmark workloads. */
export function sessionRepoBenchmarkSessionId(index: number): string {
	return `benchmark-session-${index.toString().padStart(8, "0")}`;
}

const BENCHMARK_SESSION_ID = sessionRepoBenchmarkSessionId(0);
const FORK_DESTINATION_SESSION_ID = sessionRepoBenchmarkSessionId(1);
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:35-40`）。`sessionRepoBenchmarkSessionId` 把数字索引格式化为 `benchmark-session-00000000` 这样的确定性 id，供创建/打开/删除/fork 复用；`BENCHMARK_SESSION_ID` 与 `FORK_DESTINATION_SESSION_ID` 是两个固定槽位。

### 目录数据集（42-68 行）

```ts
function createCatalogDataset(scale: string, sessionCount: number): SessionRepoCatalogBenchmarkDataset {
	return { name: `synthetic catalog: ${scale} closed sessions`, sessionCount };
}

/** Deterministic closed-session catalogs shared by repository measurements. */
export const SESSION_REPO_CATALOG_BENCHMARK_DATASETS: readonly SessionRepoCatalogBenchmarkDataset[] = [
	createCatalogDataset("100", 100),
	createCatalogDataset("1k", 1_000),
	createCatalogDataset("10k", 10_000),
];
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:42-54`）。目录基准的数据集只是一个「规模声明」：100 / 1k / 10k 个已关闭会话。`SessionRepoCatalogBenchmarkDataset` 接口很简单（见 `packages/agent/src/harness/session/testing/benchmark/session-repo.ts:7-10`：只有 `name` 与 `sessionCount`）。

```ts
/** Seeds one deterministic catalog and returns its durable metadata in creation order. */
export async function seedSessionRepoCatalogBenchmark(
	repo: SessionRepo,
	dataset: SessionRepoCatalogBenchmarkDataset,
): Promise<SessionMetadata[]> {
	const metadata: SessionMetadata[] = [];
	for (let index = 0; index < dataset.sessionCount; index++) {
		const session = await repo.create({ id: sessionRepoBenchmarkSessionId(index) }, BACKGROUND_CONTEXT);
		metadata.push(session.metadata);
		await session.close(BACKGROUND_CONTEXT);
	}
	return metadata;
}
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:57-68`）。`seedSessionRepoCatalogBenchmark` 批量 `create` 并立刻 `close` 出 `sessionCount` 个会话，返回它们的元数据数组（按创建顺序）。这是目录读/写基准的预热步骤。

### 目录读/写场景（71-127 行）

```ts
/** Shared catalog reads. Returning a number ensures each result is consumed. */
export const SESSION_REPO_CATALOG_READ_BENCHMARK_SCENARIOS: readonly SessionRepoCatalogReadBenchmarkScenario[] = [
	{
		name: "list sessions",
		expectedResult(dataset) { return dataset.sessionCount; },
		async run(repo) { return (await repo.list(undefined, BACKGROUND_CONTEXT)).length; },
	},
];
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:71-81`）。目录读场景只有一个——`list sessions`，返回会话总数（同样返回 `number` 以保活结果，注释见 `packages/agent/src/harness/session/testing/benchmark/session-repo.ts:70`）。

```ts
/** Shared catalog writes. Every invocation receives an equivalent independently prepared repository. */
export const SESSION_REPO_CATALOG_WRITE_BENCHMARK_SCENARIOS: readonly SessionRepoCatalogWriteBenchmarkScenario[] = [
	{ name: "create empty session", expectedResult: 1, prepare(repo) { return Promise.resolve({ async run() { const session = await repo.create({ id: BENCHMARK_SESSION_ID }, BACKGROUND_CONTEXT); return session.metadata.id === BENCHMARK_SESSION_ID ? 1 : 0; } }); } },
	{ name: "open closed empty session", expectedResult: 1, async prepare(repo) { const session = await repo.create({ id: BENCHMARK_SESSION_ID }, BACKGROUND_CONTEXT); const { metadata } = session; await session.close(BACKGROUND_CONTEXT); return { async run() { const reopened = await repo.open(metadata, BACKGROUND_CONTEXT); return reopened.metadata.id === metadata.id ? 1 : 0; } }; } },
	{ name: "delete closed empty session", expectedResult: 1, async prepare(repo) { const session = await repo.create({ id: BENCHMARK_SESSION_ID }, BACKGROUND_CONTEXT); const { metadata } = session; await session.close(BACKGROUND_CONTEXT); return { async run() { await repo.delete(metadata, BACKGROUND_CONTEXT); return 1; } }; } },
];
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:84-127`）。三个写场景——创建空会话、打开已关闭空会话、删除已关闭空会话——各自通过 `prepare(repo)` 返回一个 `run()` 闭包，`run` 返回 `1` 表示成功执行。`prepare` 形态（而非直接 `run`）让外层能「先准备独立仓库、再计时 `run`」，保证每次测量互不干扰。注释 `Every invocation receives an equivalent independently prepared repository`（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:83`）点明了这一隔离意图。

### 分叉基准（129-181 行）

```ts
/** Initial fork timing uses a bounded source because each iteration owns an equivalent seeded repository. */
export const SESSION_REPO_FORK_BENCHMARK_DATASETS: readonly StorageBenchmarkDataset[] = [
	STORAGE_BENCHMARK_DATASETS[0]!,  // 1k entries
	STORAGE_BENCHMARK_DATASETS[1]!,  // 10k entries
];
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:130-133`）。分叉基准直接复用 `datasets.ts` 的**存储数据集**（1k / 10k 条目）作为「源会话大小」，因为 fork 的成本随源会话规模增长。注释说明「初始 fork 计时用有界源，因为每次迭代都拥有独立播种的仓库」。

```ts
/** Seeds one deterministic open source session with a linear main branch. */
export async function seedSessionRepoForkBenchmark(
	repo: SessionRepo,
	dataset: StorageBenchmarkDataset,
): Promise<SessionMetadata> {
	const session = await repo.create({ id: BENCHMARK_SESSION_ID }, BACKGROUND_CONTEXT);
	for (const transaction of generateStorageBenchmarkSeedTransactions(dataset)) {
		await session.mutate((mutator) => mutator.commit(transaction, BACKGROUND_CONTEXT), BACKGROUND_CONTEXT);
	}
	await session.mutate(
		(mutator) =>
			mutator.commit(
				[
					setValue(branchTip("main"), dataset.tipId),
					setValue(laneConfig("main"), { model: { provider: "benchmark", modelId: "benchmark" }, thinkingLevel: "off", activeToolNames: [] }),
					setValue(laneState("main"), { currentOperationId: null, lastOperationId: null, inbox: [] }),
				],
				BACKGROUND_CONTEXT,
			),
		BACKGROUND_CONTEXT,
	);
	return session.metadata;
}
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:136-161`）。`seedSessionRepoForkBenchmark` 用 `generateStorageBenchmarkSeedTransactions` 把数据集逐批 `mutate` 进源会话，形成线性 `main` 分支，并设置 `branchTip`/`laneConfig`/`laneState`，最后返回源会话元数据。它是 fork 场景的预热。注意这里用 `session.mutate` 回调而非直接 `commit`——对应 `Session` 接口对独占变更的约定（`packages/agent/src/harness/session/types.ts:547`）。

```ts
/** Shared fork writes. Every invocation receives an equivalent source repository. */
export const SESSION_REPO_FORK_WRITE_BENCHMARK_SCENARIOS: readonly SessionRepoForkWriteBenchmarkScenario[] = [
	{
		name: "fork open current branch",
		expectedResult(dataset) { return dataset.entryCount; },
		async run(repo, source, dataset) {
			const fork = await repo.fork(
				source,
				{ id: FORK_DESTINATION_SESSION_ID, scope: "branch", branch: "main" },
				BACKGROUND_CONTEXT,
			);
			return fork.metadata.id === FORK_DESTINATION_SESSION_ID && fork.metadata.parentSessionId === source.id
				? dataset.entryCount
				: 0;
		},
	},
];
```

（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:164-181`）。唯一的分叉写场景 `fork open current branch`：从源会话的 `main` 分支做 `scope:"branch"` fork，返回 `dataset.entryCount`（即预期复制的条目数）以保活结果并核对正确性。注释 `Every invocation receives an equivalent source repository`（`packages/agent/src/harness/session/testing/benchmark/session-repo.ts:163`）强调每次测量都用独立播种的源。

## 它解决什么问题 / 为什么这样设计

会话仓库的性能瓶颈往往不在「单条存储读写」，而在「管理大量会话元数据」与「从大会话分叉」。本文件把这两类高层操作也纳入统一基准：

1. **目录规模可伸缩**：100 / 1k / 10k 三档，让后端在「会话数膨胀」时暴露 `list`/创建/删除的退化。
2. **分叉随源增长**：1k / 10k 两种源大小，量化「fork 成本如何随源会话规模变化」——这正是 `SessionRepo` 契约里 fork 复制语义的性能代价所在。
3. **隔离准备**：`prepare` 闭包与「每次独立仓储」的约定，确保测量的是单次操作而非累积状态。
4. **复用数据层**：直接消费 `datasets.ts` 与 `storage.ts` 的生成器，避免 fork 基准重复实现种子逻辑。

## 谁调用它 / 它调用谁

- **调用者**：各 `SessionRepo` 后端的基准脚本导入 `SESSION_REPO_CATALOG_BENCHMARK_DATASETS`、`seedSessionRepoCatalogBenchmark`、`SESSION_REPO_CATALOG_READ/WRITE_BENCHMARK_SCENARIOS`、`SESSION_REPO_FORK_BENCHMARK_DATASETS`、`seedSessionRepoForkBenchmark`、`SESSION_REPO_FORK_WRITE_BENCHMARK_SCENARIOS`（见 `index.ts:2-12`）。
- **被调用者**：消费 `datasets.ts` 的数据集与 `storage.ts` 的 `generateStorageBenchmarkSeedTransactions`；调用 `values.ts` 的 `branchTip/laneConfig/laneState/setValue`、`context.ts` 的 `BACKGROUND_CONTEXT`。所有实际写入都经由 `SessionRepo`/`Session` 接口，不触达具体后端。

## 与同目录其他文件的关系

- `datasets.ts` 提供底层存储数据集（`STORAGE_BENCHMARK_DATASETS`），本文件只取其中两份作为 fork 源大小，并另定义「目录数据集」`SessionRepoCatalogBenchmarkDataset`。
- `benchmark/storage.ts` 是被复用的数据层——本文件的 fork 播种逻辑建立在它的事务生成器之上，二者构成「存储基准 → 会话仓库基准」的层级。
- 与 `conformance/session-repo.ts` 互补：conformance 测 fork 的**正确性**，本文件测 fork 的**性能**。

## 自查清单

- [ ] 目录基准与分叉基准分别复用了 `datasets.ts` 中的哪些数据集？
- [ ] `seedSessionRepoForkBenchmark` 为什么用 `session.mutate` 回调而非直接 `session.commit`？
- [ ] 三个 catalog 写场景的 `prepare` 返回 `run` 闭包，这种设计与「每次独立准备的仓库」有何关联？
- [ ] `fork open current branch` 场景的 `expectedResult` 为什么返回 `dataset.entryCount`？
