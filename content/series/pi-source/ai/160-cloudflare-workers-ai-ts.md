---
title: "cloudflare-workers-ai.ts — Workers AI 直连，只要账户 id"
summary: "把这家从三层里拆出来：工厂只负责 Cloudflare Workers AI 的门牌和钥匙；协议是 cloudflareStreams(openAICompletionsApi())；模型表是 cloudflare-workers-ai"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/cloudflare-workers-ai.ts`  
核心导出：`cloudflareWorkersAIProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { cloudflareWorkersAIProvider } from "@earendil-works/pi-ai/providers/cloudflare-workers-ai"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Cloudflare Workers AI** 的门牌和钥匙；协议是 `cloudflareStreams(openAICompletionsApi())`；模型表是 [`cloudflare-workers-ai.models.ts`](/series/pi-source/ai/159-cloudflare-workers-ai-models-ts/) ← `data/cloudflare-workers-ai.json`（18 款，API 组：`openai-completions` (18)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
cloudflareWorkersAIProvider()
  createProvider({
    id: "cloudflare-workers-ai",
    name: "Cloudflare Workers AI",
    auth: ...,
    models: Object.values(CLOUDFLARE_WORKERS_AI_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "cloudflare-workers-ai"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`cloudflareWorkersAIProvider(): Provider<"openai-completions">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 厂家不设。模型 URL：`https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1`

**鉴权：** `cloudflareWorkersAIAuth()`：login 只要 API key + account id。resolve 出 `auth.apiKey` + `env.CLOUDFLARE_ACCOUNT_ID`。

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`cloudflareWorkersAIProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("cloudflare-workers-ai", id)` **不**调用本函数，读 `MODELS["cloudflare-workers-ai"]`（即 CLOUDFLARE_WORKERS_AI_MODELS）。`BuiltinProvider` 含 `"cloudflare-workers-ai"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

18 款，id 形如 `@cf/meta/llama-4-scout-17b-16e-instruct`。协议只有 completions。和 AI Gateway 共享 `cloudflare-auth.ts` 的字段合并规则（credential 里只有 key 时，account id 仍可从环境补）。

当前目录样本：`@cf/deepseek-ai/deepseek-v4-flash-0731`、`@cf/deepseek-ai/deepseek-v4-pro-0813`、`@cf/google/gemma-4-26b-a4b-it`、`@cf/ibm-granite/granite-4.0-h-micro`、`@cf/meta/llama-3.3-70b-instruct-fp8-fast`、`@cf/meta/llama-4-scout-17b-16e-instruct`、`@cf/mistralai/mistral-small-3.1-24b-instruct`、`@cf/moonshotai/kimi-k2.6`、`@cf/moonshotai/kimi-k2.7-code`、`@cf/nvidia/nemotron-3-120b-a12b`。模型表里的 `baseUrl` 是 `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1`。

`models: Object.values(CLOUDFLARE_WORKERS_AI_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`cloudflare-workers-ai.models.ts`](/series/pi-source/ai/159-cloudflare-workers-ai-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
