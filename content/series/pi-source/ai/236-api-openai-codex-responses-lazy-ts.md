---
title: "api/openai-codex-responses.lazy.ts — 按需加载 OpenAI Codex Responses 适配器"
summary: "OpenAI Codex / ChatGPT 后端 Responses 协议的垫片。真实适配器依赖 node:zlib、会话资源清理与 deferred 工具拆分，base URL 指向 chatgpt.com 后端。"
tags: [pi, ai]
---

## 这个文件是什么

```ts
import type { ProviderStreams } from "../types.ts";
import { lazyApi } from "./lazy.ts";

export const openAICodexResponsesApi = (): ProviderStreams => lazyApi(() => import("./openai-codex-responses.ts"));
```

机制见 `230-anthropic-messages` 篇。`lazyApi`（`packages/ai/src/api/lazy.ts:73`）包住动态 import。

## 真实适配器的特殊之处

`openai-codex-responses.ts` 有几个明显特征：

- 依赖 **Node-only** 的 `node:zlib`（`packages/ai/src/api/openai-codex-responses.ts:1`），用于响应体压缩处理。
- 调用 `registerSessionResourceCleanup`（`packages/ai/src/api/openai-codex-responses.ts:10`），把本次会话的资源在结束时统一回收。
- 使用 `splitDeferredTools`（`packages/ai/src/api/openai-codex-responses.ts:24`）拆分"延迟工具"，配合 Responses API 的 deferred 机制。
- 默认 `DEFAULT_CODEX_BASE_URL = "https://chatgpt.com/backend-api"`（`packages/ai/src/api/openai-codex-responses.ts:45`），即它打向 **ChatGPT 后端**，而非标准 `api.openai.com` —— 这是 Codex 与普通 OpenAI Responses 的本质区别。

它复用 `openai-responses-shared.ts` 的 `convertResponsesMessages` 等转换（`packages/ai/src/api/openai-codex-responses.ts:38`），所以线协议仍是 Responses API。

## 为什么需要懒加载

`node:zlib` 与 ChatGPT 后端专属逻辑都不该进通用冷启动图；延迟到首次调用 Codex 才加载，符合一致性策略，也避免 Node-only 依赖污染其它构建。

## 谁引用它

- 内置注册表：`packages/ai/src/compat.ts:182` 登记为 `"openai-codex-responses"`。
- provider 工厂：`packages/ai/src/providers/openai-codex.ts:20` 的 `api: openAICodexResponsesApi()`。

## 与同类文件关系

- 与 `238-openai-responses` 同源 Responses API、共享 `openai-responses-shared.ts`，区别在 base URL 与 deferred / node:zlib 特化。
- 与 `231-azure-openai-responses` 同走 Responses，但 Azure 是部署名路径、Codex 是 ChatGPT 后端。

## 自查清单

- [ ] 能否在 `packages/ai/src/api/openai-codex-responses.ts:1` 确认导入 `node:zlib`？
- [ ] 能否找到 `DEFAULT_CODEX_BASE_URL` 指向 `chatgpt.com`？
- [ ] 能否在 `packages/ai/src/compat.ts:182` 看到它登记？
