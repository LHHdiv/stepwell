---
title: "openai.ts — 最薄的完整厂家工厂"
summary: "这是 createProvider 的标准形态。读完应能默写五件套：id / name / baseUrl / auth / models / api。后面几十家只是在这五件上长刺（OAuth、多协议 map、占位符 URL、动态目录）"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/openai.ts`  
核心导出：`openaiProvider`  
被谁调用：`all.ts` 的 `builtinProviders()`；也可 `import { openaiProvider } from "@earendil-works/pi-ai/providers/openai"`。

## 本课目标

这是 `createProvider` 的标准形态。读完应能默写五件套：`id` / `name` / `baseUrl` / `auth` / `models` / `api`。后面几十家只是在这五件上长刺（OAuth、多协议 map、占位符 URL、动态目录）。

厂家 id `"openai"` ≠ 协议 `"openai-responses"`。本厂所有内建模型目前都走 Responses API；聊天 Completions 是别的厂家（Groq、DeepSeek）在用。

## 这个文件在系统中的位置

```text
openaiProvider()
  createProvider({
    models: Object.values(OPENAI_MODELS),   // 第 3 层：模型表
    api: openAIResponsesApi(),              // 第 2 层：协议（lazy）
    auth: envApiKeyAuth(..., ["OPENAI_API_KEY"]),
    baseUrl: "https://api.openai.com/v1",
  })
  → all.ts builtinProviders() → Models.setProvider
```

发请求时：

```text
Models.streamSimple(model, context)
  applyAuth → 读 OPENAI_API_KEY 或 auth.json
  provider.streamSimple
    createProvider 发现 api 是单份 ProviderStreams
    openAIResponsesApi() 第一次才 import api/openai-responses.ts
```

本文件 **零 HTTP**。看不到 `/v1/responses`、看不到 SSE。那些在 `src/api/openai-responses.ts`。

## 导出什么

唯一导出：`openaiProvider(): Provider<"openai-responses">`。泛型钉死本厂模型的 `api` 只能是 `"openai-responses"`。若以后 json 里混进 completions 模型，类型会和工厂声明打架——这是故意的：改协议要同时改工厂的 `api:` 与生成脚本。

每次调用返回新对象。`createProvider` 内部的 `dynamicModels` 闭包互不共享；OpenAI 是静态目录，没有 `fetchModels`，这个闭包一直是空数组。

## 如何鉴权 / baseUrl

```ts
auth: { apiKey: envApiKeyAuth("OpenAI API key", ["OPENAI_API_KEY"]) },
baseUrl: "https://api.openai.com/v1",
```

`envApiKeyAuth`（`auth/helpers.ts`）标准两段：

1. **login**：secret 提示 `Enter OpenAI API key`，存 `{ type: "api_key", key }`。
2. **resolve**：已存的 `credential.key` 优先，否则扫环境变量列表，命中则 `{ auth: { apiKey }, source: "OPENAI_API_KEY" }`。都没有返回 `undefined` → `Models.getAuth` 视为未配置，`streamSimple` 变成 `ModelsError("auth", "Provider is not configured: openai")`。

没有 OAuth。ChatGPT 订阅走另一家工厂 [openai-codex.ts](/series/pi-source/ai/192-openai-codex-ts/)，协议是 `openai-codex-responses`，URL 是 `https://chatgpt.com/backend-api`。两把钥匙、两个 id，不要混。

厂家级 `baseUrl` 是缺省。json 里每条模型也写了 `"baseUrl": "https://api.openai.com/v1"`。请求用的是 **模型上的** URL；厂家字段给自定义 `models.json` 覆盖时当默认。`applyAuth` 若鉴权结果带 `auth.baseUrl` 会覆盖模型 URL——标准 API key 路径不会。

## 和 all.ts 的关系

`all.ts` import `openaiProvider`，放进 `builtinProviders()` 数组（在 `openaiCodexProvider` 前）。`getBuiltinModel("openai", "gpt-5.4")` **不**调用本函数，它读 `MODELS.openai`，也就是 [openai.models.ts](/series/pi-source/ai/193-openai-models-ts/) flatten 后的表。两条路径数据同源（都来自 `data/openai.json`），一条给类型/目录，一条给运行时 Provider。

`BuiltinProvider` 含 `"openai"`。compat 的全局 `builtinModels()` 会登记这家。

## 逐步精读

```ts
import { openAIResponsesApi } from "../api/openai-responses.lazy.ts";
```

lazy 文件只有一行：`lazyApi(() => import("./openai-responses.ts"))`。第一次 stream 才加载协议实现和 `openai` npm 包。工厂模块本身可以出现在不发 OpenAI 请求的 bundle 里。

```ts
models: Object.values(OPENAI_MODELS),
```

`OPENAI_MODELS` 是 `Record<modelId, Model<"openai-responses">>`。`Object.values` 丢掉 id 键，变成 `createProvider` 要的数组。顺序是 json 对象键序（生成脚本按字母排）。id 仍在每个 `Model.id` 上。

当前表约 38 款，全在 `openai-responses` 组：GPT-4 家族、GPT-5.x、o1/o3/o4。reasoning、thinkingLevelMap、价格阶梯（`cost.tiers`）都在 json，不在本文件。

## 失败与边界

- 未配置 key：请求阶段才失败，构造 `openaiProvider()` 不会 throw。
- 模型 id 写错：`Models.getModel("openai", "gpt-4-typo")` 返回 undefined，更上层决定要不要 fallback。
- 本厂 `api` 是单份 streams。假如有人运行时改 `model.api` 成 `"openai-completions"`，`createProvider` 仍把所有请求打进 Responses 实现（单份时不按 api 分发）。混协议必须改成 map，见 [fireworks.ts](/series/pi-source/ai/166-fireworks-ts/)。
- Azure 上的同款 GPT 是另一家：`azure-openai-responses`，协议文件都不同（部署名、api-version）。不要拿本厂模型对象去打 Azure。

## 下一课

鉴权比这复杂的标准工厂：[anthropic.ts](/series/pi-source/ai/148-anthropic-ts/)（API key 三种环境变量 + Claude Pro OAuth）。模型表：[openai.models.ts](/series/pi-source/ai/193-openai-models-ts/)。
