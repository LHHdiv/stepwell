---
title: "storage.bench.ts — 一份基准文件其实只是注册表"
summary: "整份文件只有 35 行，不含任何计时循环与断言：它把「数据集 × 目标 × 场景」交给 registerReadBenchmarks / registerWriteBenchmarks 注册，真正的测量逻辑住在 agent 包的基准框架里。"
tags: [pi, session-backends]
---

## 这个文件是什么

`packages/session-backends/sqlite-node/benchmark/session/storage.bench.ts` 是存储基准的**入口文件**。

打开它的第一印象通常是困惑：只有 35 行、没有循环、没有计时、没有断言。它不像「性能测试」，倒像一份**接线表**。

这正是设计意图。pi 的基准体系把职责切开了：

| 角色 | 住哪 | 负责什么 |
|---|---|---|
| 数据集 / 场景 / 注册器 | `packages/agent/src/harness/session/testing/` | 定义「测什么」与「怎么测」 |
| 目标（target） | 本包 `storage-targets.ts` | 提供「被测对象」 |
| 接线 | **本文件** | 把三者拼起来交给框架 |

所以本文件不产生任何测量逻辑，它只声明组合关系。

## 源码解析

### 一、导入（第 1-8 行）

```ts
import {
	STORAGE_BENCHMARK_DATASETS,
	STORAGE_READ_BENCHMARK_SCENARIOS,
	STORAGE_WRITE_BENCHMARK_SCENARIOS,
	seedStorageBenchmark,
} from "@earendil-works/pi-agent-core/harness/session/testing";
import { registerReadBenchmarks, registerWriteBenchmarks } from "../../../../agent/benchmark/session/benchmark.ts";
import { storageBenchmarkTargets } from "./storage-targets.ts";
```

三类导入对应上表的三行：**场景与数据集**来自 agent 包的测试基础设施（通过包说明符），**注册器**直接指向 agent 包的物理路径，**目标**来自同目录。

注意 `seedStorageBenchmark`——它是「播种函数」：把数据集灌进存储，让读基准有东西可读。写基准不需要播种（写本身就是动作），所以它只出现在下面的读注册里。

### 二、注册读基准（第 10-20 行）

```ts
await registerReadBenchmarks({
	datasets: STORAGE_BENCHMARK_DATASETS,
	targets: storageBenchmarkTargets,
	scenarios: STORAGE_READ_BENCHMARK_SCENARIOS,
	prepare(fixture, dataset) {
		return seedStorageBenchmark(fixture.storage, dataset);
	},
	getSubject(fixture) {
		return fixture.storage;
	},
});
```

顶层 `await` 是这里第一个值得注意的语法点。`.bench.ts` 由 vitest 以 ESM 加载，顶层 await 让「注册」这个动作在文件求值时完成——**框架通过副作用收集基准**，而不是靠导出某个对象。这也是为什么这个文件没有 `export`。

四个参数中，`datasets` × `scenarios` 是笛卡尔积的组合空间：框架会对每个数据集跑每个读场景。

`prepare` 把「夹具」变成「可测对象」：先用 `seedStorageBenchmark` 把数据集写进 `fixture.storage`，再通过 `getSubject` 声明「拿哪个东西去读」。**播种与取主体分成两步**，是刻意的——播种的耗时不能算进被测耗时，否则读基准里会混入写成本。

### 三、注册写基准（第 22-35 行）

```ts
await registerWriteBenchmarks({
	targets: storageBenchmarkTargets,
	scenarios: STORAGE_WRITE_BENCHMARK_SCENARIOS,
	async prepare(fixture, scenario) {
		await scenario.prepare?.(fixture.storage);
		return fixture.storage;
	},
	expectedResult(scenario) {
		return scenario.writeCount;
	},
	run(storage, scenario) {
		return scenario.run(storage);
	},
});
```

与读注册的三个差异，每一处都有含义：

**一、没有 `datasets`。** 写基准不需要预置数据——它的输入由场景自己描述（写多少条、什么粒度）。

**二、`prepare` 委托给场景自己。** `scenario.prepare?.(...)` 带可选链：有的写场景需要前置（例如先建好某个分支），有的不需要。把前置换给场景，注册方就不必了解每种场景的细节。

**三、多了 `expectedResult`。** 基准并非只看耗时，还要验证「确实写进去了这么多条」。`scenario.writeCount` 是期望的写入条数——这是**基准里的正确性护栏**：如果某次优化让写入变快，但实际少写了一半，`expectedResult` 会暴露它。没有这道护栏，性能优化很容易退化成功能退化。

**四、`run` 是显式的。** 读基准里没有 `run`，是因为「读」的动作由场景定义统一表达；写基准把 `run(storage, scenario)` 交给注册者实现，给了目标侧的适配空间。

## 为什么基准要做成「注册」而非「写测试」

如果把基准写成普通的 `it()` 用例、里面手写计时循环，会立刻遇到三个问题：

1. **没法横向对比。** 想比较 SQLite 与 Postgres，得把计时逻辑复制两份，然后祈祷两份写法一致。
2. **计时噪声无人处理。** 预热、重复轮数、离群值处理——每份手写循环都要重现一遍，且往往重现得不对。
3. **数据集与场景无法复用。** 「100 条消息的会话」「10000 条消息的会话」这类数据集，是所有后端共享的资产。

注册表模式把变化的部分（目标）与不变的部分（框架、数据集、场景）分离，代价是多了一层间接——读刚才那 35 行时会有「测什么到底在哪」的短暂迷失。理解这层间接，才算读懂了这个文件。

## 自查清单

- [ ] 这个文件为什么没有 `export`？框架如何得知基准存在？
- [ ] 读注册里的 `prepare` 为什么与「取主体」要分成两步？
- [ ] `expectedResult` 在写基准里承担什么角色？去掉会发生什么？
- [ ] 如果要新增一个 Postgres 后端来跑同一套基准，需要改这个文件吗？
