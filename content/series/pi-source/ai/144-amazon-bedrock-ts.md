---
title: "amazon-bedrock.ts — AWS 凭证链 + Converse Stream，厂家级不写死 URL"
summary: "把这家从三层里拆出来：工厂只负责 Amazon Bedrock 的门牌和钥匙；协议是 bedrockConverseStreamApi()（lazy → api/bedrock-converse-stream.ts）；模型表是 amaz"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/amazon-bedrock.ts`  
核心导出：`amazonBedrockProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { amazonBedrockProvider } from "@earendil-works/pi-ai/providers/amazon-bedrock"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Amazon Bedrock** 的门牌和钥匙；协议是 `bedrockConverseStreamApi()`（lazy → `api/bedrock-converse-stream.ts`）；模型表是 [`amazon-bedrock.models.ts`](/series/pi-source/ai/143-amazon-bedrock-models-ts/) ← `data/amazon-bedrock.json`（121 款，API 组：`bedrock-converse-stream` (121)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
amazonBedrockProvider()
  createProvider({
    id: "amazon-bedrock",
    name: "Amazon Bedrock",
    auth: ...,
    models: Object.values(AMAZON_BEDROCK_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "amazon-bedrock"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`amazonBedrockProvider(): Provider<"bedrock-converse-stream">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 厂家对象**没有** `baseUrl`。端点在模型表：默认 `https://bedrock-runtime.us-east-1.amazonaws.com`，EU 前缀模型走 `eu-central-1`。

**鉴权：** 自定义 `bedrockAuth`：login 三选一（Bearer token / AWS profile / 现有 credential chain）。resolve：存了 key 当 bearer；否则探测 `AWS_BEARER_TOKEN_BEDROCK`、`AWS_PROFILE`、AK/SK、ECS 任务角色、web identity。命中时常常 `auth: {}`——真正签名在协议实现里用 AWS SDK 默认链，钥匙不进 pi 的 credential store。

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`amazonBedrockProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("amazon-bedrock", id)` **不**调用本函数，读 `MODELS["amazon-bedrock"]`（即 AMAZON_BEDROCK_MODELS）。`BuiltinProvider` 含 `"amazon-bedrock"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

Bedrock 是云托管的「别人的模型」。模型 id 带厂商前缀：`anthropic.claude-opus-4-8`、`openai.gpt-5.6-sol`、`meta.llama4-scout-...`、`eu.anthropic.` 区域前缀。**协议不是** anthropic-messages，一律 `bedrock-converse-stream`。

login 选「Existing AWS credential chain」只存 `{ type: "api_key" }` 空壳，表示「环境里已经有 AWS」。resolve 扫一串环境变量，有一个算配置成功。这和 `envApiKeyAuth` 完全不同：没有单一 `BEDROCK_API_KEY`。

`builtinProviders()` 含这家。静态目录 121 款，是内建里最大的单一协议表之一。

当前目录样本：`amazon.nova-2-lite-v1:0`、`amazon.nova-lite-v1:0`、`amazon.nova-micro-v1:0`、`amazon.nova-pro-v1:0`、`anthropic.claude-fable-5`、`anthropic.claude-fable-5-1`、`anthropic.claude-haiku-4-5-20251001-v1:0`、`anthropic.claude-opus-4-1-20250805-v1:0`、`anthropic.claude-opus-4-5-20251101-v1:0`、`anthropic.claude-opus-4-6-v1`。模型表里出现过这些 `baseUrl`：`https://bedrock-runtime.us-east-1.amazonaws.com`、`https://bedrock-runtime.eu-central-1.amazonaws.com`。

`models: Object.values(AMAZON_BEDROCK_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`amazon-bedrock.models.ts`](/series/pi-source/ai/143-amazon-bedrock-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
