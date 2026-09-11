---
title: "opencode.ts — OpenCode Zen，四协议 + 会话头"
summary: "把这家从三层里拆出来：工厂只负责 OpenCode Zen 的门牌和钥匙；协议是 四份 lazy api 都包 withOpenCodeSessionHeader；模型表是 opencode.models.ts ← data/openc"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/opencode.ts`  
核心导出：`opencodeProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { opencodeProvider } from "@earendil-works/pi-ai/providers/opencode"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **OpenCode Zen** 的门牌和钥匙；协议是 四份 lazy api 都包 `withOpenCodeSessionHeader`；模型表是 [`opencode.models.ts`](/series/pi-source/ai/198-opencode-models-ts/) ← `data/opencode.json`（63 款，API 组：`anthropic-messages` (14)、`google-generative-ai` (7)、`openai-completions` (17)、`openai-responses` (25)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是 **map**，按 `model.api` 分发。

## 这个文件在系统中的位置

```text
opencodeProvider()
  createProvider({
    id: "opencode",
    name: "OpenCode Zen",
    auth: ...,
    models: Object.values(OPENCODE_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "opencode"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`opencodeProvider(): Provider<"anthropic-messages" | "google-generative-ai" | "openai-completions" | "openai-responses">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 厂家不设总 URL。json：Messages 用 `https://opencode.ai/zen`，其余用 `https://opencode.ai/zen/v1`。

**鉴权：** `envApiKeyAuth("OpenCode API key", ["OPENCODE_API_KEY"])`，与 opencode-go 共用变量

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`opencodeProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("opencode", id)` **不**调用本函数，读 `MODELS["opencode"]`（即 OPENCODE_MODELS）。`BuiltinProvider` 含 `"opencode"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

Zen 把 Claude/Gemini/GPT/开源模型汇在一个 key 下，所以工厂必须是 api map。`x-opencode-session` 把 Agent 的 `sessionId` 传给网关做路由/缓存，见 [opencode-headers.ts](/series/pi-source/ai/197-opencode-headers-ts/)。

约 63 款（14+7+17+25）。Go 套餐是另一家 `opencode-go`，模型子集不同，会话头相同。

当前目录样本：`claude-fable-5`、`claude-fable-5-1`、`claude-haiku-4-5`、`claude-opus-4-5`、`claude-opus-4-6`、`claude-opus-4-7`、`claude-opus-4-8`、`claude-opus-5`、`claude-sonnet-4`、`claude-sonnet-4-5`。模型表里出现过这些 `baseUrl`：`https://opencode.ai/zen`、`https://opencode.ai/zen/v1`。

`models: Object.values(OPENCODE_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`opencode.models.ts`](/series/pi-source/ai/198-opencode-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
