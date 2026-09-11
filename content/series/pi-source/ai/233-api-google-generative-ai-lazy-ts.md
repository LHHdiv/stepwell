---
title: "api/google-generative-ai.lazy.ts — 按需加载 Google Generative AI 适配器"
summary: "Google AI Studio / generativelanguage 公网路径的垫片。与 google-vertex 共用 @google/genai 与 google-shared 转换逻辑，区别在鉴权与接入点。"
tags: [pi, ai]
---

## 这个文件是什么

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const googleGenerativeAIApi = (): ProviderStreams => lazyApi(() => import("./google-generative-ai.ts"));
```

机制见 `230-anthropic-messages` 篇：`lazyApi`（`packages/ai/src/api/lazy.ts:73`）包住动态 import，调用方同步拿到 `ProviderStreams`。

## 真实适配器的特殊之处

`google-generative-ai.ts` 从 `@google/genai` 导入 `GoogleGenAI`（`packages/ai/src/api/google-generative-ai.ts:4`），走 Google 的 Generate Content 协议。它和 `234-google-vertex` 篇的适配器**共用** `google-shared.ts` 里的一整套消息/工具/停止原因转换（如 `convertMessages`、`resolveGoogleThinkingLevel`、`retainThoughtSignature`，`packages/ai/src/api/google-generative-ai.ts:27-43`），差异主要在接入路径：

- 本适配器面向 **Google AI Studio / `generativelanguage.googleapis.com`** 的公网 API Key 路径。
- `google-vertex` 面向 **GCP Vertex AI**，需要 project / location 与 ADC（应用默认凭证）鉴权，`google-vertex.ts:1-9` 额外导入 `ResourceScope`、`ThinkingLevel`。

## 为什么需要懒加载

`@google/genai` 是较重的 SDK。把它移出冷启动图，只在用户真正使用 Gemini 公网端点时才加载，符合全系列"按厂商延迟"的一致性策略。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:184` 登记为 `"google-generative-ai"`。
- provider 工厂：`packages/ai/src/providers/google.ts:13`、`packages/ai/src/providers/opencode.ts:20`。

## 与同类文件关系

- 与 `234-google-vertex` 同源 `@google/genai`、共享 `google-shared.ts`，仅鉴权/接入点不同。
- 与 `230-anthropic-messages` 同为 4 行标准垫片。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/google-generative-ai.ts:4` 确认导入 `GoogleGenAI`？
- [ ] 能否指出它与 `google-vertex` 的核心区别（公网 API Key vs GCP Vertex）？
- [ ] 能否在 `packages/ai/src/compat.ts:184` 看到它登记？
