---
title: "vitest.config.ts — sqlite-node 的测试运行时配置"
summary: "session-backends/sqlite-node 的 vitest 配置。它把五个 pi 内部包的 import 用 alias 钉到源码入口，让测试直接跑 TypeScript 而不依赖构建产物，同时把覆盖率口径收窄到 src/**。"
tags: [pi, session-backends]
---

## 这个文件是什么

`packages/session-backends/sqlite-node/vitest.config.ts` 是这个包运行 `vitest` 时的配置。它不定义任何测试用例——用例在 `test/` 目录下。这个文件决定的是「用例以什么身份、在什么环境下运行」。

它只做三件事：

1. 把测试环境固定在 Node；
2. 把五个跨包 import 重定向到**源码入口**而不是构建产物；
3. 把覆盖率统计口径收窄到 `src/**`。

## 源码解析

### 一、先把跨包入口解析成绝对路径（第 1-10 行）

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const telemetryIndex = fileURLToPath(new URL("../../telemetry/src/index.ts", import.meta.url));
const aiIndex = fileURLToPath(new URL("../../ai/src/index.ts", import.meta.url));
const agentIndex = fileURLToPath(new URL("../../agent/src/index.ts", import.meta.url));
const agentNode = fileURLToPath(new URL("../../agent/src/node.ts", import.meta.url));
const agentSessionTesting = fileURLToPath(
	new URL("../../agent/src/harness/session/testing/index.ts", import.meta.url),
);
```

五条常量，对应五个要改道的入口。注意它们指向的都是 **`src/` 下的 `.ts` 源文件**，不是 `dist/`。

`fileURLToPath(new URL(..., import.meta.url))` 是 ESM 里「相对本文件定位」的标准写法：`import.meta.url` 是本配置文件的 `file://` URL，`new URL("../../telemetry/src/index.ts", ...)` 相对它解析，再转成文件系统路径。

> 为什么不用 `path.resolve(__dirname, ...)`？因为在 ESM 模块里 `__dirname` 不存在。这是 pi 全仓库使用 ESM 的一个直接后果。

### 二、测试环境与覆盖率（第 12-25 行）

```ts
test: {
	globals: true,
	environment: "node",
	reporters: process.env.GITHUB_ACTIONS ? ["dot", "github-actions"] : ["dot"],
	coverage: {
		provider: "v8",
		all: true,
		include: ["src/**/*.ts"],
		exclude: ["src/**/*.d.ts"],
		reporter: ["text", "html", "lcov"],
		reportsDirectory: "coverage",
	},
},
```

- `globals: true`：让 `describe` / `it` / `expect` 成为全局变量，用例里不必每个都 import。
- `environment: "node"`：这是**关键**。sqlite-node 依赖 `node:sqlite` 与文件系统，跑在 jsdom 或 happy-dom 里会直接失败。
- `reporters` 按 `GITHUB_ACTIONS` 环境变量切换：CI 里额外输出 GitHub Actions 注解，本地只有 `dot`。**同一份配置适配两种运行场所**。
- 覆盖率 `include: ["src/**/*.ts"]` + `exclude: ["src/**/*.d.ts"]`：只统计真正会执行的源码，类型声明文件天然不产生覆盖率，必须排除，否则覆盖率数字永远上不去。

### 三、把包名改道到源码（第 26-35 行）

```ts
resolve: {
	conditions: ["source"],
	alias: [
		{ find: /^@earendil-works\/pi-telemetry$/, replacement: telemetryIndex },
		{ find: /^@earendil-works\/pi-agent-core\/node$/, replacement: agentNode },
		{ find: /^@earendil-works\/pi-agent-core\/harness\/session\/testing$/, replacement: agentSessionTesting },
		{ find: /^@earendil-works\/pi-agent-core$/, replacement: agentIndex },
		{ find: /^@earendil-works\/pi-ai$/, replacement: aiIndex },
	],
},
ssr: { resolve: { conditions: ["source"] } },
```

这是整份配置最核心的部分，有三点值得注意：

**第一，alias 的匹配顺序从具体到宽泛。** `@earendil-works/pi-agent-core/node` 和 `.../harness/session/testing` 都写在 `@earendil-works/pi-agent-core` 前面。因为 alias 是正则逐条匹配，若宽泛的写在前面，子路径会被它先截获，改道到错误的入口。

**第二，`find` 用的是正则对象而不是字符串。** 包名里含 `/`，用正则可以精确锚定 `^...$`，避免把 `@earendil-works/pi-ai-extra` 这种前缀相同的包误伤。

**第三，`conditions: ["source"]` 出现在两处。** 一处是顶层 `resolve`（影响常规解析），一处是 `ssr.resolve`（影响服务端侧解析）。pi 的 `package.json` 里通过 `exports` 条件导出来区分「源码入口」和「构建产物入口」；把 `source` 放前面，就能让测试始终读到 TypeScript 源码。这与第 27 章「包出口与条件导出」是同一套机制。

## 为什么要有这一层

一个自然的疑问是：既然包都在同一个 monorepo 里，为什么不直接 import 构建后的产物？

因为那样会**让测试与构建产物耦合**。改了 `agent/src/harness/session/testing/types.ts` 之后如果忘了 `npm run build`，测试仍然跑的是旧 `dist`，会给出与源码不符的结论——最糟的是它「通过了」。把 alias 钉到源码，测试结果才与当前源码等价。

代价是 vitest 需要现场转译 TypeScript，首次运行会慢一些。这个代价换来的是测试的可信度。

## 它调用谁、谁调用它

- 它被 `vitest` CLI 自动加载（约定文件名 `vitest.config.ts`）。
- 它解析的五个入口分别来自 `packages/telemetry`、`packages/ai`、`packages/agent`。
- 它与同目录的 `vitest.benchmark.config.ts` 是**分工关系**：那份只跑基准、不统计覆盖率，详见下一篇。

## 自查清单

- [ ] 能否说出 `conditions: ["source"]` 为什么同时出现在顶层 `resolve` 和 `ssr.resolve` 里？
- [ ] alias 数组里为什么把 `.../node` 与 `.../harness/session/testing` 排在父包名之前？
- [ ] `environment` 若改成 `jsdom`，这个包的测试会最先因为什么原因失败？
- [ ] 覆盖率 `exclude` 里为什么要排除 `*.d.ts`？
