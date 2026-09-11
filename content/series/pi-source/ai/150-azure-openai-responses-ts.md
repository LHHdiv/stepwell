---
title: "azure-openai-responses.ts — Azure 部署名，模型 URL 留空"
summary: "把这家从三层里拆出来：工厂只负责 Azure OpenAI 的门牌和钥匙；协议是 azureOpenAIResponsesApi() — 不是 openAIResponsesApi()；模型表是 azure-openai-respons"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/azure-openai-responses.ts`  
核心导出：`azureOpenAIResponsesProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { azureOpenAIResponsesProvider } from "@earendil-works/pi-ai/providers/azure-openai-responses"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Azure OpenAI** 的门牌和钥匙；协议是 `azureOpenAIResponsesApi()` — **不是** `openAIResponsesApi()`；模型表是 [`azure-openai-responses.models.ts`](/series/pi-source/ai/149-azure-openai-responses-models-ts/) ← `data/azure-openai-responses.json`（38 款，API 组：`azure-openai-responses` (38)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
azureOpenAIResponsesProvider()
  createProvider({
    id: "azure-openai-responses",
    name: "Azure OpenAI",
    auth: ...,
    models: Object.values(AZURE_OPENAI_RESPONSES_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "azure-openai-responses"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`azureOpenAIResponsesProvider(): Provider<"azure-openai-responses">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 厂家**不设** `baseUrl`。json 里 38 款模型的 `baseUrl` 全是空字符串。真正的 `https://{resource}.openai.azure.com/openai/deployments/...` 必须由鉴权/`models.json`/请求 options 在 `applyAuth` 里补上。

**鉴权：** `envApiKeyAuth("Azure OpenAI API key", ["AZURE_OPENAI_API_KEY"])`

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`azureOpenAIResponsesProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("azure-openai-responses", id)` **不**调用本函数，读 `MODELS["azure-openai-responses"]`（即 AZURE_OPENAI_RESPONSES_MODELS）。`BuiltinProvider` 含 `"azure-openai-responses"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

Azure 的 Responses 和官方 OpenAI 不是同一条 HTTP：api-version、部署名、鉴权头都不同，所以有独立 `KnownApi`。模型 id 看起来像 `gpt-5.4`，但不能拿 openai 厂的 Model 对象去打 Azure——`provider` 字段不同，`Models.requireProvider` 会找错厂家。

空 baseUrl 是刻意的：每个客户的资源名不同，生成脚本不能写死。未配置端点时协议层会失败，工厂构造不会。

当前目录样本：`gpt-4`、`gpt-4-turbo`、`gpt-4.1`、`gpt-4.1-mini`、`gpt-4.1-nano`、`gpt-4o`、`gpt-4o-2024-05-13`、`gpt-4o-2024-08-06`、`gpt-4o-2024-11-20`、`gpt-4o-mini`。模型表里的 `baseUrl` 是 `(空字符串)`。

`models: Object.values(AZURE_OPENAI_RESPONSES_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`azure-openai-responses.models.ts`](/series/pi-source/ai/149-azure-openai-responses-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
