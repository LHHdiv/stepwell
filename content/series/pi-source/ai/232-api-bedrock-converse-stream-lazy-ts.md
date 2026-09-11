---
title: "api/bedrock-converse-stream.lazy.ts — 用变量说明符规避打包器追踪 Node-only AWS SDK"
summary: "本篇是唯一 30 行的垫片。它用「变量说明符 import」让打包器无法静态追进 Node-only 的 @aws-sdk/client-bedrock-runtime，并提供 setBedrockProviderModule 给 Bun 二进制覆盖。"
tags: [pi, ai]
---

## 这个文件是什么

`bedrock-converse-stream.lazy.ts` 有 30 行，比其它 4 行垫片复杂得多，因为它要解决一个别的适配器没有的问题：底层 AWS SDK 是 **Node-only** 的，不能进入浏览器/CLI 的初始依赖图，甚至不能被打包器静态解析。

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

const importNodeOnlyApi = (specifier: string): Promise<unknown> => {
	const runtimeSpecifier = import.meta.url.endsWith(".js") ? specifier.replace(/\.ts$/, ".js") : specifier;
	return import(runtimeSpecifier);
};

let bedrockModuleOverride: ProviderStreams | undefined;

export function setBedrockProviderModule(module: ProviderStreams): void {
	bedrockModuleOverride = module;
}

export const bedrockConverseStreamApi = (): ProviderStreams =>
	lazyApi(
		async () =>
			bedrockModuleOverride ?? ((await importNodeOnlyApi("./bedrock-converse-stream.ts")) as ProviderStreams),
	);
```

（完整内容见 `packages/ai/src/api/bedrock-converse-stream.lazy.ts:1-31`。）

## 两个关键设计

**1. 变量说明符 import（`packages/ai/src/api/bedrock-converse-stream.lazy.ts:10`）**

直接写 `import("./bedrock-converse-stream.ts")` 是字符串字面量，打包器（浏览器 smoke、Bun compile）能解析并追进里面那个 `import ... from "@aws-sdk/client-bedrock-runtime"`。把说明符先放进变量 `specifier`、再 `return import(runtimeSpecifier)`，打包器就无法静态跟随，于是 Node-only 的 AWS SDK 不会污染通用构建产物。`.ts`→`.js` 的改写（`:11`）保证从源码跑与从构建产物跑两种模式下都能解析到正确文件。

**2. 模块覆盖（`packages/ai/src/api/bedrock-converse-stream.lazy.ts:15-24`）**

`bedrockModuleOverride` 是个模块级变量。`setBedrockProviderModule` 允许在 Bun 二进制构建里"先静态 import、再注册覆盖"——因为变量说明符的 import 在那种构建下无法被打包，构建脚本改为静态引入该实现并调用此函数注入，运行时 `bedrockModuleOverride ?? (...)`（`:29`）优先用覆盖版本。

## 为什么需要懒加载（且需要这层额外包装）

真正的 `bedrock-converse-stream.ts` 顶部一口气导入 `BedrockRuntimeClient` 等大量符号（`packages/ai/src/api/bedrock-converse-stream.ts:2-28`），全部来自 `@aws-sdk/client-bedrock-runtime`，并依赖 `node:https` 的 `HttpsAgent`（`packages/ai/src/api/bedrock-converse-stream.ts:1`）、`@smithy/node-http-handler`、代理 agent（`packages/ai/src/api/bedrock-converse-stream.ts:25-28`）。这是纯 Node 环境代码：一旦进浏览器打包图就会失败，进 CLI 初始图则徒增冷启动重量。动态 + 变量说明符的双重延迟，是它相对其它垫片的额外必要性。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:187` 登记为 `"bedrock-converse-stream"`。
- provider 工厂：`packages/ai/src/providers/amazon-bedrock.ts:88` 的 `api: bedrockConverseStreamApi()`。

## 与同类文件关系

- 机制仍基于 `lazyApi`（`packages/ai/src/api/lazy.ts:73`），但 `load` 闭包被替换成"先看覆盖、否则变量说明符动态 import"的自定义逻辑。
- 它是 11 篇里唯一为规避打包器而改写说明符的垫片。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/bedrock-converse-stream.lazy.ts:10` 找到 `importNodeOnlyApi` 的变量说明符写法？
- [ ] 能否解释 `.ts`→`.js` 改写为何同时兼容源码与构建产物？
- [ ] 能否在 `packages/ai/src/api/bedrock-converse-stream.ts:2` 确认底层是 `@aws-sdk/client-bedrock-runtime`？
- [ ] 能否说明 `setBedrockProviderModule` 服务于哪种构建场景？
