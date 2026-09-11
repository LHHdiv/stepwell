---
title: "session-repo.bench.ts — 三次注册：目录读写与 fork 的笛卡尔积"
summary: "会话仓库基准的接线表。比 storage 版多出一段 fork 基准，并用 flatMap 把「数据集 × 场景」展开成组合项——这一段最能说明基准框架为什么要留出组合空间。"
tags: [pi, session-backends]
---

## 这个文件是什么

`packages/session-backends/sqlite-node/benchmark/session/session-repo.bench.ts` 是会话仓库基准的入口。

与 `storage.bench.ts` 一样，它本身不含测量逻辑，只做「注册」。但它的注册有**三段**而不是两段，第三段里还有一个笛卡尔积展开——这一段是理解这套基准框架设计动机的最好样本。

## 源码解析

### 一、导入（第 1-11 行）

```ts
import {
	SESSION_REPO_CATALOG_BENCHMARK_DATASETS,
	SESSION_REPO_CATALOG_READ_BENCHMARK_SCENARIOS,
	SESSION_REPO_CATALOG_WRITE_BENCHMARK_SCENARIOS,
	SESSION_REPO_FORK_BENCHMARK_DATASETS,
	SESSION_REPO_FORK_WRITE_BENCHMARK_SCENARIOS,
	seedSessionRepoCatalogBenchmark,
	seedSessionRepoForkBenchmark,
} from "@earendil-works/pi-agent-core/harness/session/testing";
import { registerReadBenchmarks, registerWriteBenchmarks } from "../../../../agent/benchmark/session/benchmark.ts";
import { sessionRepoBenchmarkTargets } from "./session-repo-targets.ts";
```

七个符号分成两组：`CATALOG`（目录，即会话的列举与读写）与 `FORK`（从已有会话派生新分支）。两个 seed 函数也一一对应。

对比 `storage.bench.ts` 的四个导入符号，这里多出整整一组——**导入清单预示了这份基准多出一个维度**。

### 二、第一段：目录读基准（第 13-23 行）

```ts
await registerReadBenchmarks({
	datasets: SESSION_REPO_CATALOG_BENCHMARK_DATASETS,
	targets: sessionRepoBenchmarkTargets,
	scenarios: SESSION_REPO_CATALOG_READ_BENCHMARK_SCENARIOS,
	async prepare(fixture, dataset) {
		await seedSessionRepoCatalogBenchmark(fixture.repo, dataset);
	},
	getSubject(fixture) {
		return fixture.repo;
	},
});
```

与 storage 版结构一致：播种把数据集灌进 `fixture.repo`，`getSubject` 交出仓库本身作为被测主体。注意 `prepare` 是 `async`（仓库的播种涉及真实落盘，是异步的），而 storage 版直接 `return`。

### 三、第二段：目录写基准（第 25-37 行）

```ts
await registerWriteBenchmarks({
	targets: sessionRepoBenchmarkTargets,
	scenarios: SESSION_REPO_CATALOG_WRITE_BENCHMARK_SCENARIOS,
	prepare(fixture, scenario) {
		return scenario.prepare(fixture.repo);
	},
	expectedResult(scenario) {
		return scenario.expectedResult;
	},
	run(operation) {
		return operation.run();
	},
});
```

这一段的 `expectedResult` 与 `run` 都**从场景对象上取**（`scenario.expectedResult`、`operation.run()`），而 storage 版的 `run` 是 `scenario.run(storage)`——即由注册方把主体传进去。

两种风格的差别在于**主体是谁**：目录写场景自带全套操作（它知道要往哪个仓库写、写什么），所以可以直接调用它自己的方法；而 storage 的写场景需要一个外部传入的 storage。这是场景定义侧的设计选择，注册方只是顺着适配。

> 读这类文件时容易卡在「为什么这两处写法不一样」。答案通常不在本文件，而在场景定义的形状上。

### 四、第三段：fork 写基准的笛卡尔积（第 39-62 行）

```ts
const forkBenchmarks = SESSION_REPO_FORK_BENCHMARK_DATASETS.flatMap((dataset) =>
	SESSION_REPO_FORK_WRITE_BENCHMARK_SCENARIOS.map((scenario) => ({
		name: `${scenario.name} (${dataset.name})`,
		dataset,
		scenario,
	})),
);

await registerWriteBenchmarks({
	targets: sessionRepoBenchmarkTargets,
	scenarios: forkBenchmarks,
	async prepare(fixture, benchmark) {
		return {
			repo: fixture.repo,
			source: await seedSessionRepoForkBenchmark(fixture.repo, benchmark.dataset),
		};
	},
	expectedResult(benchmark) {
		return benchmark.scenario.expectedResult(benchmark.dataset);
	},
	run(subject, benchmark) {
		return benchmark.scenario.run(subject.repo, subject.source, benchmark.dataset);
	},
});
```

这是三段的重点，四处值得细读：

**一、`flatMap` 里套 `map`**：把「若干个数据集」×「若干个场景」摊平成一个组合列表。结果项是 `{ name, dataset, scenario }` 三元组。`flatMap` 而非先 `map` 再嵌套数组，是为了把二维展开成一维——基准列表必须是一维的。

**二、名字里同时带场景与数据集**：`` `${scenario.name} (${dataset.name})` ``。这是因为同一场景在不同数据集上的耗时可能相差数量级，报告里若不区分就无从解读。「从 100 条消息的会话 fork」与「从 10000 条消息的会话 fork」，是两件完全不同的事。

**三、`prepare` 返回的结构变了**：不再是 `fixture.repo`，而是 `{ repo, source }`。`source` 是播种得到的**源会话**——fork 必须有源。这解释了为什么 fork 基准要单独一组数据集：数据集描述的正是「源会话长什么样」。

**四、`run` 拿到两样东西**：`subject.repo` 与 `subject.source`。这三段注册里，`run` 的参数形态从一段到三段逐步变复杂（无参 → 单参 → 双参），因为被测动作的信息需求在增加。

## 这三段合起来说明了什么

基准框架之所以要做成「注册 + 组合」，而不是写死的测试列表，答案就藏在这份文件里：

- **同一批目标**（这里是 SQLite 后端）要跑**多个维度**的组合；
- **维度会增长**：会话仓库除了目录读写，还有 fork 这种「派生」操作，将来还可能有压缩、导出；
- **每增加一个维度，成本应该落在「多写一段注册」上，而不是「多写一整套计时与统计代码」**。

`storage.bench.ts` 有两段、本文件有三段，形式上是一样的接线。差别只体现在组合列表怎么构造、`run` 需要多少参数——而这些都由场景定义侧决定。

## 自查清单

- [ ] fork 基准的 `prepare` 为什么返回 `{ repo, source }` 而不是单个对象？
- [ ] 基准名字里为什么要同时拼上场景名与数据集名？
- [ ] `flatMap` 在这里的作用是什么？换成两层 `map` 会得到什么结构？
- [ ] 如果要新增「压缩后会话」的基准，需要修改本文件的哪一部分？
