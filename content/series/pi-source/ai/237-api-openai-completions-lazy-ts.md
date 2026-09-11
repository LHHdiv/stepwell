---
title: "api/openai-completions.lazy.ts — 按需加载 OpenAI Chat Completions 适配器"
summary: "复用最广的 OpenAI 兼容垫片之一。大量第三方厂商说 OpenAI Chat Completions 协议，都通过它复用 openai SDK，被约 20 个 provider 引用。"
tags: [pi, ai]
---

## 这个文件是什么

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const openAICompletionsApi = (): ProviderStreams => lazyApi(() => import("./openai-completions.ts"));
```

机制见 `230-anthropic-messages` 篇。`lazyApi`（`packages/ai/src/api/lazy.ts:73`）包住动态 import。

## 真实适配器的特殊之处

`openai-completions.ts` 从 `openai` 导入 `OpenAI`（`packages/ai/src/api/openai-completions.ts:1`），走 **Chat Completions** 流式协议（`ChatCompletionChunk`，`packages/ai/src/api/openai-completions.ts:4`）。它导出 `OpenAICompletionsCompat` 类型（`packages/ai/src/api/openai-completions.ts:24`），这个"兼容性"标记正是大量 OpenAI 兼容厂商能共用本适配器的原因：DeepSeek、Groq、Qwen、MiniMax、Z.ai 等只是换 base URL 与 API Key，线协议完全一致。

## 为什么需要懒加载

`openai` 是 ai 包里最重的 SDK 之一，而它服务的厂商数量又最多。如果静态全量加载，等于默认把最胖的依赖绑进冷启动。动态 import 让只有真正命中某个 OpenAI 兼容 provider 时才加载 `openai` 一次（ESM 缓存去重，重复调用不重复加载）。

## 谁引用它（复用最广）

除内置注册表 `packages/ai/src/compat.ts:180` 外，它还被约 20 个 provider 工厂直接调用，例如：

- `huggingface.ts:13`、`together.ts:13`、`deepseek.ts:13`、`groq.ts:13`、`cerebras.ts:13`
- `qwen-token-plan*.ts`、`xiaomi*.ts`、`moonshotai*.ts`、`zai.ts:13`、`ant-ling.ts:13`
- `opencode.ts:21`、`opencode-go.ts:17`、`github-copilot.ts:30`、`cloudflare-ai-gateway.ts:23`、`fireworks.ts:16`、`openrouter.ts:24`

也就是说，一个用户没用任何 OpenAI 系模型时，这整个 `openai` SDK 都不会被加载。

## 与同类文件关系

- 与 `238-openai-responses` 同依赖 `openai`，但本篇走 Chat Completions、那篇走 Responses API。
- 与 `230-anthropic-messages` 同属"被大量厂商复用"的通用垫片。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/openai-completions.ts:1` 确认导入 `OpenAI`？
- [ ] 能否在 `packages/ai/src/compat.ts:180` 看到它登记？
- [ ] 能否列举至少 5 个复用 `openAICompletionsApi()` 的非 OpenAI provider？
