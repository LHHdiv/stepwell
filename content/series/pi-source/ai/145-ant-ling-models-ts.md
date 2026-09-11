---
title: "ant-ling.models.ts — 把 `data/ant-ling.json` flatten 成可类型化的模型表"
summary: "看清第 3 层：本文件不发请求、不鉴权、不认识 HTTP。它是 generate-models.ts 生成的 8 行包装："
tags: [pi, ai]
---
源码：`packages/ai/src/providers/ant-ling.models.ts`  
核心导出：`ANT_LING_MODELS`  
被谁调用：[`ant-ling.ts`](/series/pi-source/ai/146-ant-ling-ts/) 的 `Object.values(ANT_LING_MODELS)`；`src/models.generated.ts` 把它挂到 `MODELS["ant-ling"]`。

## 本课目标

看清第 3 层：**本文件不发请求、不鉴权、不认识 HTTP**。它是 generate-models.ts 生成的 8 行包装：

```ts
import values from "./data/ant-ling.json" with { type: "json" };
import { flattenModelCatalog, type ModelCatalog } from "../model-catalog.ts";

export const ANT_LING_MODELS: ModelCatalog<typeof values, "ant-ling"> =
  flattenModelCatalog("ant-ling", values);
```

`flattenModelCatalog` 就是 `Object.assign({}, ...Object.values(groups))`：把「按 api 分组的 json」摊成 `Record<modelId, Model>`。分组的唯一目的是让 TypeScript 从 json 键推出「这个 id 的 `api` 字面量是哪一个」。

## 这个文件在系统中的位置

```text
scripts/generate-models.ts
  写出 providers/data/ant-ling.json     （gitignore，按 api 分组）
  写出 providers/ant-ling.models.ts     （提交到 git，稳定包装）
  写出 src/models.generated.ts       MODELS["ant-ling"] = ANT_LING_MODELS

运行时：
  antLingProvider()  → models: Object.values(ANT_LING_MODELS)
  getBuiltinModel("ant-ling", ...) → MODELS["ant-ling"][id]   // 不 new 工厂
```

改模型：改生成脚本或上游 models.dev，跑 `npm run generate-models`。**不要手改本文件**，下次生成会被覆盖。

## 导出什么

`ANT_LING_MODELS`：`ModelCatalog<typeof values, "ant-ling">`。

- 键：所有模型 id 的联合（一组内唯一；校验脚本禁止同一 id 出现在两个 api 组）。
- 值：`Model<该组的 api>` 且 `provider: "ant-ling"`。
- 当前共 **3** 款，api 组：`openai-completions` (3)。

## 如何鉴权 / baseUrl

本文件没有 auth。钥匙在 [`ant-ling.ts`](/series/pi-source/ai/146-ant-ling-ts/)。

模型表里的 `baseUrl` 是 `https://api.ant-ling.com/v1`。 这是**每条模型自己的门牌**，请求优先用它。厂家工厂上的 `baseUrl` 只是缺省/给自定义模型用。Azure 那种空字符串必须在鉴权阶段补端点。Cloudflare 的 `{CLOUDFLARE_*}` 由 stream 包装替换，json 里保持占位符。

价格 `cost`、窗口、`input: ["text","image"]`、`compat` 都在 json 对象上，随模型走到 `calculateCost` / 协议实现。

## 和 all.ts 的关系

`all.ts` **不 import 本文件**。它 import `MODELS`（聚合器）做 `getBuiltinModel`，import `antLingProvider` 做运行时登记。两边最终都读到同一份 flatten 结果。

`ant-ling` 在 `builtinProviders()` 里（有）。Radius 没有对应 `*.models.ts`，所以你看不到 `radius.models.ts`。

## 本表内容

### 组 `openai-completions`

3 款。样本：`Ling-2.6-1T`、`Ling-2.6-flash`、`Ring-2.6-1T`。

1 款 reasoning；3 款带 compat；1 款带 thinkingLevelMap。

`baseUrl` 取值：`https://api.ant-ling.com/v1`。

第一条模型的字段形状（生成器保证每条都有 id/name/api/provider/cost/contextWindow/maxTokens 等，见 `scripts/model-data.ts` 校验）：`id`, `name`, `api`, `provider`, `baseUrl`, `reasoning`, `input`, `cost`, `contextWindow`, `maxTokens`，可选 `headers` / `compat` / `thinkingLevelMap` / `cost.tiers`。

## 失败与边界

- json 缺失（未 hydrate）：`import ... with { type: "json" }` 在运行时炸掉。git clone 后要 `npm run generate-models` 或 `hydrate-model-data`。
- 手改 json 与 `ANT_LING_MODELS` 类型不一致：`check-model-data.ts` / generate 末尾 `validateGeneratedModelData` 会比对 structureHash。
- flatten 之后丢失「属于哪一组」的结构，只剩 `model.api` 字段。这够 `createProvider` 的 map 分发。
- 同一 `modelId` 不能跨组重复——`readProviderStructure` 会 throw。

## 下一课

工厂：[`ant-ling.ts`](/series/pi-source/ai/146-ant-ling-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/#ant-ling)。
