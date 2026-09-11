---
title: "api/azure-openai-responses.lazy.ts — 按需加载 Azure OpenAI Responses 适配器"
summary: "OpenAI Responses 协议的 Azure 托管变体垫片。与 openai-responses 共享同一套 Responses 转换逻辑，但多了部署名映射与 api-version 处理。"
tags: [pi, ai]
---

## 这个文件是什么

4 行垫片，把 Azure 版 OpenAI Responses 适配器延迟到首次调用才加载：

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const azureOpenAIResponsesApi = (): ProviderStreams => lazyApi(() => import("./azure-openai-responses.ts"));
```

机制与 `230-anthropic-messages` 篇所述一致：`lazyApi`（`packages/ai/src/api/lazy.ts:73`）包住一个动态 import，外部拿到同步的 `ProviderStreams`，内部模块在第一次 `stream()` 时才真正执行。

## 它对应的真实适配器有什么特殊

`azure-openai-responses.ts` 与 `openai-responses.ts` 一样走 OpenAI **Responses API**（`ResponseCreateParamsStreaming`，`packages/ai/src/api/azure-openai-responses.ts:2`），并复用同一组转换工具 `convertResponsesMessages / convertResponsesTools / processResponsesStream`（`packages/ai/src/api/azure-openai-responses.ts:21`，来自 `openai-responses-shared.ts`）。区别在于它针对 Azure 托管的特殊性：

- 使用 `AzureOpenAI` 客户端而非裸 `OpenAI`（`packages/ai/src/api/azure-openai-responses.ts:1`）。
- 默认 `DEFAULT_AZURE_API_VERSION = "v1"`（`packages/ai/src/api/azure-openai-responses.ts:24`），请求要带 `api-version` 查询参数。
- `parseDeploymentNameMap`（`packages/ai/src/api/azure-openai-responses.ts:29`）把模型名映射到 Azure 的"部署名"，这是 Azure 与标准 OpenAI 最大的接线差异。
- `AZURE_TOOL_CALL_PROVIDERS` 集合（`packages/ai/src/api/azure-openai-responses.ts:25`）明确把自身列入支持工具调用的 provider。

## 为什么需要懒加载

Azure 适配器同样依赖 `openai` 这个重型 SDK。把它放进静态图，等于把"用户根本没选 Azure"时也要加载的 SDK 提前拖进来。动态 import 让只有真正命中 Azure 部署的会话才付出这份额外成本。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:183` 登记为 `"azure-openai-responses"`。
- 兼容别名：`packages/ai/src/legacy-api-aliases.ts` 中对应条目。
- provider 工厂：`packages/ai/src/providers/azure-openai-responses.ts:12` 的 `api: azureOpenAIResponsesApi()`。

## 与同类文件关系

- 与 `238-openai-responses` 同源：共享 `openai-responses-shared.ts` 的转换逻辑，仅客户端与部署名处理不同。
- 与 `236-openai-codex-responses` 同走 Responses API，但 Codex 是 ChatGPT 后端、且支持 deferred 工具。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/azure-openai-responses.ts:1` 确认它导入的是 `AzureOpenAI`？
- [ ] 能否找到 `DEFAULT_AZURE_API_VERSION` 与 `parseDeploymentNameMap` 的定义位置？
- [ ] 能否在 `packages/ai/src/compat.ts:183` 看到它被登记？
- [ ] 能否说清它和 `openai-responses` 的核心差异（部署名 / api-version）？
