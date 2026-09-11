---
title: "vitest.benchmark.config.ts — 为什么基准要一份独立配置"
summary: "session-backends/sqlite-node 的基准运行时配置。它与测试配置同源但只跑 benchmark/session/**/*.bench.ts、不统计覆盖率，并少了一条 agent/node 的 alias —— 这处差异本身说明了基准对运行环境的要求。"
tags: [pi, session-backends]
---

## 这个文件是什么

`packages/session-backends/sqlite-node/vitest.benchmark.config.ts` 是**基准（benchmark）专用的 vitest 配置**。

同目录已经有一份 `vitest.config.ts` 跑单元测试，为什么还要单独一份？因为「测正确性」和「测性能」对运行环境的要求是冲突的：单元测试要覆盖率、要并行、要快；基准要独占资源、要稳定计时、要把结果完整打出来。硬塞进一份配置，两者都会受损。

## 源码解析

### 一、入口常量（第 1-9 行）

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const telemetryIndex = fileURLToPath(new URL("../../telemetry/src/index.ts", import.meta.url));
const aiIndex = fileURLToPath(new URL("../../ai/src/index.ts", import.meta.url));
const agentIndex = fileURLToPath(new URL("../../agent/src/index.ts", import.meta.url));
const agentSessionTesting = fileURLToPath(
	new URL("../../agent/src/harness/session/testing/index.ts", import.meta.url),
);
```

与 `vitest.config.ts` 的前四条完全一致，但**少了 `agentNode`（`../../agent/src/node.ts`）这一条**。

这是一处不该被忽略的差异。`agentNode` 对应 `@earendil-works/pi-agent-core/node` 入口，那个入口负责把 `ExecutionEnv` 绑到 Node 实现（子进程、文件系统）。基准里如果不需要跑真实工具调用，就不必引入这一层；少一条 alias 意味着少解析一个模块，也少一份潜在的副作用。

> 读配置文件的技巧：**差异比相同点更有信息量**。两份配置里相同的部分说明它们共享前提，不同的部分才是各自的设计意图。

### 二、只跑基准、只输出 verbose（第 11-18 行）

```ts
test: {
	environment: "node",
	benchmark: {
		include: ["benchmark/session/**/*.bench.ts"],
		reporters: ["verbose"],
	},
},
```

三个关键点：

**`environment: "node"`**：与测试配置一致，仍必须是 Node。SQLite 与文件系统不可替代。

**`include: ["benchmark/session/**/*.bench.ts"]`**：把基准文件的收集范围**收窄到 `benchmark/session/`**。`.bench.ts` 后缀让 vitest 能区分基准与普通用例；即使不写 include，vitest 也不会把 `.bench.ts` 当普通测试跑——但显式写明范围能防止将来在别处加了基准文件后忘记纳入。

**`reporters: ["verbose"]`**：基准要 verbose 输出。原因很实际：默认的 `dot` reporter 只打点，而基准确要看的恰是**每个场景的名字与耗时数字**——「哪个数据集在哪个目标上慢了 3 倍」，这些信息全在逐行输出里。跑基准却不看逐行数字，等于没跑。

注意这里**完全没有 `coverage` 段**。基准不产生有意义的覆盖率（它跑的是同一批代码路径，且会严重拉长耗时），硬统计只会污染覆盖率报告。

### 三、alias 与解析条件（第 19-28 行）

```ts
resolve: {
	conditions: ["source"],
	alias: [
		{ find: /^@earendil-works\/pi-telemetry$/, replacement: telemetryIndex },
		{ find: /^@earendil-works\/pi-agent-core\/session\/testing$/, replacement: agentSessionTesting },
		{ find: /^@earendil-works\/pi-agent-core$/, replacement: agentIndex },
		{ find: /^@earendil-works\/pi-ai$/, replacement: aiIndex },
	],
},
ssr: { resolve: { conditions: ["source"] } },
```

四条 alias，比测试配置少一条。剩下四条的作用与上一篇完全相同：**让基准也跑在当前源码上**。

这一点对基准比对测试更关键。基准的全部意义是给出「这个版本有多快」的数字；如果它跑的是三天前构建的 `dist`，那么你刚做的性能优化在数字上完全不可见，你会误判优化无效——或者更糟，误判无效而回退了一个真实有效的改动。

第三条 alias 的路径也值得留意：这里写的是 `pi-agent-core/session/testing`，而测试配置里写的是 `pi-agent-core/harness/session/testing`。两处字符串并不一致，但都指向同一个文件 `agent/src/harness/session/testing/index.ts`。alias 的 `find` 是正则，只负责「命中哪些 import 说明」，`replacement` 才是真实目标——**说明符与物理路径不是一回事**，这在读配置时极易混淆。

## 这份配置与谁协作

- 与 `vitest.config.ts` 是**同源分叉**关系：共享解析策略，分离关注点（覆盖率 vs 计时）。
- 它收集的两个基准文件是 `benchmark/session/storage.bench.ts` 与 `benchmark/session/session-repo.bench.ts`，各自配对一份 `*-targets.ts`。
- 基准的**数据集与场景定义**不在本包，而在 `packages/agent/src/harness/session/testing/`。本包只提供「被测目标（target）」。

## 自查清单

- [ ] 基准配置为什么不需要覆盖率？如果强行加上会发生什么？
- [ ] `reporters: ["verbose"]` 相比默认的 `dot`，多给了哪些信息？
- [ ] 测试配置比基准配置多出的那条 alias（`agentNode`）对应什么能力？
- [ ] 两份配置里第三条 alias 的说明符字符串并不相同，为何仍然指向同一文件？
