---
title: "openai-codex.ts — ChatGPT 订阅后端，只有 OAuth"
summary: "把这家从三层里拆出来：工厂只负责 OpenAI Codex 的门牌和钥匙；协议是 openAICodexResponsesApi()；模型表是 openai-codex.models.ts ← data/openai-codex.jso"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/openai-codex.ts`  
核心导出：`openaiCodexProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { openaiCodexProvider } from "@earendil-works/pi-ai/providers/openai-codex"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **OpenAI Codex** 的门牌和钥匙；协议是 `openAICodexResponsesApi()`；模型表是 [`openai-codex.models.ts`](/series/pi-source/ai/191-openai-codex-models-ts/) ← `data/openai-codex.json`（7 款，API 组：`openai-codex-responses` (7)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
openaiCodexProvider()
  createProvider({
    id: "openai-codex",
    name: "OpenAI Codex",
    auth: ...,
    models: Object.values(OPENAI_CODEX_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "openai-codex"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`openaiCodexProvider(): Provider<"openai-codex-responses">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** `https://chatgpt.com/backend-api`

**鉴权：** **没有 apiKey。** 只有 `lazyOAuth({ name: "OpenAI (ChatGPT Plus/Pro)", isSubscription: true, load: loadOpenAICodexOAuth })`。

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`openaiCodexProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("openai-codex", id)` **不**调用本函数，读 `MODELS["openai-codex"]`（即 OPENAI_CODEX_MODELS）。`BuiltinProvider` 含 `"openai-codex"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

与 `openai` 厂彻底分开：不同 id、不同协议、不同主机、不同登录。API key 用户用 openai；Plus/Pro 用这家。

7 款：gpt-5.3-codex-spark、gpt-5.4/mini、gpt-5.5、gpt-5.6-luna/sol/terra。协议支持 websocket 传输（`Transport` 类型），细节在 api 文件，工厂只把 streams 焊上。

未 OAuth 则 `getAuth` 为空，stream 直接 auth error。没有 `OPENAI_API_KEY` 后备——那是另一家的变量。

当前目录样本：`gpt-5.3-codex-spark`、`gpt-5.4`、`gpt-5.4-mini`、`gpt-5.5`、`gpt-5.6-luna`、`gpt-5.6-sol`、`gpt-5.6-terra`。模型表里的 `baseUrl` 是 `https://chatgpt.com/backend-api`。

`models: Object.values(OPENAI_CODEX_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`openai-codex.models.ts`](/series/pi-source/ai/191-openai-codex-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
