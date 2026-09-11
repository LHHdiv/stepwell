---
title: "api/openai-responses.lazy.ts — 按需加载 OpenAI Responses 适配器"
summary: "OpenAI Responses API 的标准垫片。复用 openai-responses-shared 转换逻辑，支持 deferred 工具拆分，被 openai、xai 等多个 provider 引用。"
tags: [pi, ai]
---

## 这个文件是什么

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const openAIResponsesApi = (): ProviderStreams => lazyApi(() => import("./openai-responses.ts"));
```

机制见 `230-anthropic-messages` 篇。

## 真实适配器的特殊之处

`openai-responses.ts` 从 `openai` 导入 `OpenAI`（`packages/ai/src/api/openai-responses.ts:1`），走 OpenAI 较新的 **Responses API**（`ResponseCreateParamsStreaming`，`packages/ai/src/api/openai-responses.ts:2`）。它导出 `OpenAIResponsesCompat` 类型（`packages/ai/src/api/openai-responses.ts:10`），复用 `openai-responses-shared.ts` 的 `convertResponsesMessages / convertResponsesTools / processResponsesStream`（`packages/ai/src/api/openai-responses.ts:28`），并使用 `splitDeferredTools`（`packages/ai/src/api/openai-responses.ts:18`）支持延迟工具调用。

注意：Responses API 是比 Chat Completions 更新的有状态协议，所以它与 `237-openai-completions` 虽同依赖 `openai`，但线协议与转换层都不同。

## 为什么需要懒加载

`openai` SDK 较重，且 Responses 路径还涉及 deferred 工具等额外逻辑。延迟加载保持"按厂商付费"的一致性。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:181` 登记为 `"openai-responses"`。
- 兼容别名：`legacy-api-aliases.ts` 对应条目。
- provider 工厂：`openai.ts:13`、`xai.ts:22`、`opencode-go.ts:18`、`opencode.ts:22`、`github-copilot.ts:31`、`cloudflare-ai-gateway.ts:24`。

## 与同类文件关系

- 与 `237-openai-completions` 同源 `openai` SDK，区别在 Chat Completions vs Responses API。
- 与 `236-openai-codex-responses`、`231-azure-openai-responses` 同走 Responses API，但 base URL / 客户端 / deferred 特化不同。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/openai-responses.ts:2` 确认走 Responses API？
- [ ] 能否找到它对 `openai-responses-shared.ts` 的复用？
- [ ] 能否在 `packages/ai/src/compat.ts:181` 看到它登记？
