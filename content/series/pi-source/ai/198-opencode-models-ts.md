---
title: "opencode.models.ts — 把 `data/opencode.json` flatten 成可类型化的模型表"
summary: "看清第 3 层：本文件不发请求、不鉴权、不认识 HTTP。它是 generate-models.ts 生成的 8 行包装："
tags: [pi, ai]
---
源码：`packages/ai/src/providers/opencode.models.ts`  
核心导出：`OPENCODE_MODELS`  
被谁调用：[`opencode.ts`](/series/pi-source/ai/199-opencode-ts/) 的 `Object.values(OPENCODE_MODELS)`；`src/models.generated.ts` 把它挂到 `MODELS["opencode"]`。

## 本课目标

看清第 3 层：**本文件不发请求、不鉴权、不认识 HTTP**。它是 generate-models.ts 生成的 8 行包装：

```ts
import values from "./data/opencode.json" with { type: "json" };
import { flattenModelCatalog, type ModelCatalog } from "../model-catalog.ts";

export const OPENCODE_MODELS: ModelCatalog<typeof values, "opencode"> =
  flattenModelCatalog("opencode", values);
```

`flattenModelCatalog` 就是 `Object.assign({}, ...Object.values(groups))`：把「按 api 分组的 json」摊成 `Record<modelId, Model>`。分组的唯一目的是让 TypeScript 从 json 键推出「这个 id 的 `api` 字面量是哪一个」。

## 这个文件在系统中的位置

```text
scripts/generate-models.ts
  写出 providers/data/opencode.json     （gitignore，按 api 分组）
  写出 providers/opencode.models.ts     （提交到 git，稳定包装）
  写出 src/models.generated.ts       MODELS["opencode"] = OPENCODE_MODELS

运行时：
  opencodeProvider()  → models: Object.values(OPENCODE_MODELS)
  getBuiltinModel("opencode", ...) → MODELS["opencode"][id]   // 不 new 工厂
```

改模型：改生成脚本或上游 models.dev，跑 `npm run generate-models`。**不要手改本文件**，下次生成会被覆盖。

## 导出什么

`OPENCODE_MODELS`：`ModelCatalog<typeof values, "opencode">`。

- 键：所有模型 id 的联合（一组内唯一；校验脚本禁止同一 id 出现在两个 api 组）。
- 值：`Model<该组的 api>` 且 `provider: "opencode"`。
- 当前共 **63** 款，api 组：`anthropic-messages` (14)、`google-generative-ai` (7)、`openai-completions` (17)、`openai-responses` (25)。

## 如何鉴权 / baseUrl

本文件没有 auth。钥匙在 [`opencode.ts`](/series/pi-source/ai/199-opencode-ts/)。

模型表里出现过这些 `baseUrl`：`https://opencode.ai/zen`、`https://opencode.ai/zen/v1`。 这是**每条模型自己的门牌**，请求优先用它。厂家工厂上的 `baseUrl` 只是缺省/给自定义模型用。Azure 那种空字符串必须在鉴权阶段补端点。Cloudflare 的 `{CLOUDFLARE_*}` 由 stream 包装替换，json 里保持占位符。

价格 `cost`、窗口、`input: ["text","image"]`、`compat` 都在 json 对象上，随模型走到 `calculateCost` / 协议实现。

## 和 all.ts 的关系

`all.ts` **不 import 本文件**。它 import `MODELS`（聚合器）做 `getBuiltinModel`，import `opencodeProvider` 做运行时登记。两边最终都读到同一份 flatten 结果。

`opencode` 在 `builtinProviders()` 里（有）。Radius 没有对应 `*.models.ts`，所以你看不到 `radius.models.ts`。

## 本表内容

### 组 `anthropic-messages`

14 款。样本：`claude-fable-5`、`claude-fable-5-1`、`claude-haiku-4-5`、`claude-opus-4-5`、`claude-opus-4-6`、`claude-opus-4-7`、`claude-opus-4-8`、`claude-opus-5`、`claude-sonnet-4`、`claude-sonnet-4-5`、`claude-sonnet-4-6`、`claude-sonnet-5` …。

14 款 reasoning；8 款带 compat；8 款带 thinkingLevelMap。

`baseUrl` 取值：`https://opencode.ai/zen`。

### 组 `google-generative-ai`

7 款。样本：`gemini-3-flash`、`gemini-3.1-pro`、`gemini-3.5-flash`、`gemini-3.5-flash-lite`、`gemini-3.6-flash`、`gemini-3.7-flash`、`gemini-3.8-flash`。

7 款 reasoning；7 款带 thinkingLevelMap。

`baseUrl` 取值：`https://opencode.ai/zen/v1`。

### 组 `openai-completions`

17 款。样本：`big-pickle`、`deepseek-v4-flash`、`deepseek-v4-pro`、`glm-5`、`glm-5.1`、`glm-5.2`、`kimi-k2.5`、`kimi-k2.6`、`kimi-k2.7-code`、`kimi-k3`、`ling-3.0-flash-fin-free`、`mimo-v2.5-free` …。

17 款 reasoning；17 款带 compat；4 款带 thinkingLevelMap。

`baseUrl` 取值：`https://opencode.ai/zen/v1`。

### 组 `openai-responses`

25 款。样本：`gpt-5`、`gpt-5-codex`、`gpt-5-nano`、`gpt-5.1`、`gpt-5.1-codex`、`gpt-5.1-codex-max`、`gpt-5.1-codex-mini`、`gpt-5.2`、`gpt-5.2-codex`、`gpt-5.3-codex`、`gpt-5.4`、`gpt-5.4-mini` …。

25 款 reasoning；25 款带 compat；25 款带 thinkingLevelMap。

`baseUrl` 取值：`https://opencode.ai/zen/v1`。

第一条模型的字段形状（生成器保证每条都有 id/name/api/provider/cost/contextWindow/maxTokens 等，见 `scripts/model-data.ts` 校验）：`id`, `name`, `api`, `provider`, `baseUrl`, `reasoning`, `input`, `cost`, `contextWindow`, `maxTokens`，可选 `headers` / `compat` / `thinkingLevelMap` / `cost.tiers`。

## 失败与边界

- json 缺失（未 hydrate）：`import ... with { type: "json" }` 在运行时炸掉。git clone 后要 `npm run generate-models` 或 `hydrate-model-data`。
- 手改 json 与 `OPENCODE_MODELS` 类型不一致：`check-model-data.ts` / generate 末尾 `validateGeneratedModelData` 会比对 structureHash。
- flatten 之后丢失「属于哪一组」的结构，只剩 `model.api` 字段。这够 `createProvider` 的 map 分发。
- 同一 `modelId` 不能跨组重复——`readProviderStructure` 会 throw。

## 下一课

工厂：[`opencode.ts`](/series/pi-source/ai/199-opencode-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/#opencode)。
