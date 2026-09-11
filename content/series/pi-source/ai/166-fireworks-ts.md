---
title: "fireworks.ts — 一家工厂、两份协议、两个路径后缀"
summary: "把这家从三层里拆出来：工厂只负责 Fireworks 的门牌和钥匙；协议是 api: { \"anthropic-messages\": anthropicMessagesApi(), \"openai-completions\": openA"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/fireworks.ts`  
核心导出：`fireworksProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { fireworksProvider } from "@earendil-works/pi-ai/providers/fireworks"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Fireworks** 的门牌和钥匙；协议是 `api: { "anthropic-messages": anthropicMessagesApi(), "openai-completions": openAICompletionsApi() }`；模型表是 [`fireworks.models.ts`](/series/pi-source/ai/165-fireworks-models-ts/) ← `data/fireworks.json`（19 款，API 组：`anthropic-messages` (15)、`openai-completions` (4)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是 **map**，按 `model.api` 分发。

## 这个文件在系统中的位置

```text
fireworksProvider()
  createProvider({
    id: "fireworks",
    name: "Fireworks",
    auth: ...,
    models: Object.values(FIREWORKS_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "fireworks"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`fireworksProvider(): Provider<"anthropic-messages" | "openai-completions">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 厂家缺省 `https://api.fireworks.ai/inference`。Messages 模型用这个；completions 模型 json 写成 `.../inference/v1`。

**鉴权：** `envApiKeyAuth("Fireworks API key", ["FIREWORKS_API_KEY"])` 一把钥匙打两种协议

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`fireworksProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("fireworks", id)` **不**调用本函数，读 `MODELS["fireworks"]`（即 FIREWORKS_MODELS）。`BuiltinProvider` 含 `"fireworks"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

这是「`api` 为 map」的教材。`createProvider` 按 `model.api` 选 streams；json 把 DeepSeek/GLM/Kimi 等放进 Messages 组（15），把 glm-5p2、kimi-k3 及 fast router 放进 Completions 组（4）。

厂家级 baseUrl 没有 `/v1`，Completions 实现通常拼 `/chat/completions`，所以 json 给 completions 模型单独加了 `/v1`。读模型对象上的 URL，不要只看工厂缺省。

当前目录样本：`accounts/fireworks/models/deepseek-v4-flash-0731`、`accounts/fireworks/models/deepseek-v4-flash-vision-exp`、`accounts/fireworks/models/deepseek-v4-pro-0813`、`accounts/fireworks/models/glm-5p3`、`accounts/fireworks/models/glm-5p3-flash`、`accounts/fireworks/models/gpt-oss-120b`、`accounts/fireworks/models/inkling`、`accounts/fireworks/models/kimi-k2p6`、`accounts/fireworks/models/kimi-k2p7-code`、`accounts/fireworks/models/minimax-m3`。模型表里出现过这些 `baseUrl`：`https://api.fireworks.ai/inference`、`https://api.fireworks.ai/inference/v1`。

`models: Object.values(FIREWORKS_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`fireworks.models.ts`](/series/pi-source/ai/165-fireworks-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
