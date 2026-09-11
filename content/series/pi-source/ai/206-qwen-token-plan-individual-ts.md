---
title: "qwen-token-plan-individual.ts — Qwen Token Plan 个人套餐白名单"
summary: "把这家从三层里拆出来：工厂只负责 Qwen Token Plan Individual 的门牌和钥匙；协议是 openAICompletionsApi()；模型表是 qwen-token-plan-individual.models.t"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/qwen-token-plan-individual.ts`  
核心导出：`qwenTokenPlanIndividualProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { qwenTokenPlanIndividualProvider } from "@earendil-works/pi-ai/providers/qwen-token-plan-individual"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Qwen Token Plan Individual** 的门牌和钥匙；协议是 `openAICompletionsApi()`；模型表是 [`qwen-token-plan-individual.models.ts`](/series/pi-source/ai/205-qwen-token-plan-individual-models-ts/) ← `data/qwen-token-plan-individual.json`（8 款，API 组：`openai-completions` (8)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
qwenTokenPlanIndividualProvider()
  createProvider({
    id: "qwen-token-plan-individual",
    name: "Qwen Token Plan Individual",
    auth: ...,
    models: Object.values(QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "qwen-token-plan-individual"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`qwenTokenPlanIndividualProvider(): Provider<"openai-completions">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 与 `qwen-token-plan` 相同的新加坡 compatible-mode URL

**鉴权：** 与企业国际站共用 `QWEN_TOKEN_PLAN_API_KEY`

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`qwenTokenPlanIndividualProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("qwen-token-plan-individual", id)` **不**调用本函数，读 `MODELS["qwen-token-plan-individual"]`（即 QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS）。`BuiltinProvider` 含 `"qwen-token-plan-individual"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

生成脚本 `QWEN_TOKEN_PLAN_INDIVIDUAL_MODEL_IDS` 白名单 8 款（文档 2026-09-03 核实）。同 key 打两家：企业目录 18 款、个人 8 款。选错厂家会在 UI 里看到不该出现的模型。

当前目录样本：`deepseek-v4-flash-0731`、`deepseek-v4-pro`、`deepseek-v4-pro-0813`、`glm-5.2`、`qwen3.6-flash`、`qwen3.7-max`、`qwen3.7-plus`、`qwen3.8-max`。模型表里的 `baseUrl` 是 `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`。

`models: Object.values(QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`qwen-token-plan-individual.models.ts`](/series/pi-source/ai/205-qwen-token-plan-individual-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
