---
title: "api/anthropic-messages.lazy.ts — 按需加载 Anthropic Messages 适配器"
summary: "ai 包里复用最广的「懒加载垫片」之一：用动态 import 把 Anthropic Messages 适配器从 CLI 冷启动图中剥离。本文把 lazyApi / lazyStream 机制讲透，后续各篇聚焦差异。"
tags: [pi, ai]
---

## 这个文件是什么

`packages/ai/src/api/anthropic-messages.lazy.ts` 只有 4 行，它本身**不实现任何 API 调用**，只是一个工厂函数，返回一个"看起来像适配器、但真正代码还没加载"的 `ProviderStreams` 对象：

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const anthropicMessagesApi = (): ProviderStreams => lazyApi(() => import("./anthropic-messages.ts"));
```

关键在于最后一行的 `import("./anthropic-messages.ts")` —— 这是一个**动态 import**，不是静态 `import`。真正的实现 `anthropic-messages.ts` 只在第一次调用 `stream` / `streamSimple` 时才被下载并执行。

## 懒加载机制（全系列通用，本文详述）

所有 `*.lazy.ts` 垫片都依赖 `packages/ai/src/api/lazy.ts` 里的两个函数：`lazyApi` 和 `lazyStream`。

`lazyApi` 在 `packages/ai/src/api/lazy.ts:73` 定义，它接一个 `load` 闭包（里面是动态 import），返回一个 `ProviderStreams`：

```ts
export function lazyApi(load: () => Promise<ProviderStreams>, capabilities?: LazyApiCapabilities): ProviderStreams {
	const api: ProviderStreams = {
		stream: (model, context, options) =>
			lazyStream(model, async () => (await load()).stream(model, context, options)),
		streamSimple: (model, context, options) =>
			lazyStream(model, async () => (await load()).streamSimple(model, context, options)),
	};
	// ...fetchDeferred / cancelDeferred 可选挂载
	return api;
}
```

`stream` 和 `streamSimple` 的签名与 `ProviderStreams`（`packages/ai/src/types.ts:272`）完全一致：都是同步返回 `AssistantMessageEventStream`。也就是说，**无论底层模块有没有加载完，调用方拿到的都是一个立即可用的流对象**。

同步返回、异步加载是怎么做到的？答案是 `lazyStream`（`packages/ai/src/api/lazy.ts:46`）。它先同步 `new AssistantMessageEventStream()` 返回出去，再在背后 `.then` 里执行 `setup()`（即 `await load()` 真正加载模块并调用 `.stream(...)`），然后把内部流的事件逐个 `forwardStream` 转发到外层流（`packages/ai/src/api/lazy.ts:31`）。如果加载或连接失败，`.catch` 会构造一条 `stopReason: "error"` 的助手指纹消息并推入流（`packages/ai/src/api/lazy.ts:54`），调用方无需特殊分支就能感知启动期错误。

可选参数 `LazyApiCapabilities`（`packages/ai/src/api/lazy.ts:68`）控制是否挂载 `fetchDeferred` / `cancelDeferred`：只有真实适配器支持延迟（deferred）响应时才挂上，否则调用会抛 "API does not support deferred responses"。本系列 11 篇里只有 `openai-codex-responses`、`openai-responses` 等少数适配器需要它。

加载去重：ESM 规范保证同一个 `import(specifier)` 只执行一次，宿主的模块缓存会把 `anthropic-messages.ts` 的加载结果复用给后续所有调用。所以即便十几个 provider 都调用 `anthropicMessagesApi()`，真正的模块也只加载一次。

## 为什么需要懒加载

ai 包支持 40+ 厂商，每个适配器都拉一个重型 SDK：`anthropic-messages.ts` 顶部 `import Anthropic from "@anthropic-ai/sdk"`（`packages/ai/src/api/anthropic-messages.ts:1`）。如果全部静态 import，CLI 冷启动时要解析、编译、实例化所有这些 SDK，拖慢首响、吃内存，还可能触发某些 Node-only 依赖（见 `232-bedrock` 篇）。动态 import 把它们移出初始依赖图，只在用户真正选中某个模型时才加载对应那一个。

## 谁引用它

- 内置 API 注册表：`packages/ai/src/compat.ts:179` 把它登记为 `"anthropic-messages"`。
- 兼容旧版导出：`packages/ai/src/legacy-api-aliases.ts:19` 用 `anthropicMessagesApi()` 构造已废弃的 `stream` / `streamSimple` 别名。
- 复用最广：因为大量第三方网关"说"的是 Anthropic Messages 线协议，下面这些 provider 直接复用本垫片 —— `anthropic.ts:57`、`fireworks.ts:15`、`opencode.ts:19`、`opencode-go.ts:16`、`github-copilot.ts:29`、`openrouter.ts:23`、`cloudflare-ai-gateway.ts:22`、`minimax-cn.ts:13`、`vercel-ai-gateway.ts:13`、`kimi-coding.ts:22`、`minimax.ts:13`、`ant-ling.ts:13` 等。

## 与同类文件关系

- 机制同款：`237-openai-completions`、`238-openai-responses` 等其余垫片都用 `lazyApi` + 动态 import，区别只是目标模块。
- 协议不同：`anthropic-messages` 走 Anthropic 的 `messages` 流式协议；`openai-completions` 走 OpenAI Chat Completions，`openai-responses` 走 Responses API。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/lazy.ts:73` 找到 `lazyApi` 的定义？
- [ ] 能否确认 `anthropic-messages.lazy.ts` 用的是动态 `import()` 而非静态 `import`？
- [ ] 能否在 `packages/ai/src/compat.ts:179` 看到它被登记为内置 API？
- [ ] 能否列举至少 3 个复用 `anthropicMessagesApi()` 的非 anthropic provider？
