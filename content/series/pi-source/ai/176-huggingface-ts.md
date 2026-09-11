---
title: "huggingface.ts — HF Router，七十款 Completions"
summary: "把这家从三层里拆出来：工厂只负责 Hugging Face 的门牌和钥匙；协议是 openAICompletionsApi()；模型表是 huggingface.models.ts ← data/huggingface.json（70 "
tags: [pi, ai]
---
源码：`packages/ai/src/providers/huggingface.ts`  
核心导出：`huggingfaceProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { huggingfaceProvider } from "@earendil-works/pi-ai/providers/huggingface"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Hugging Face** 的门牌和钥匙；协议是 `openAICompletionsApi()`；模型表是 [`huggingface.models.ts`](/series/pi-source/ai/175-huggingface-models-ts/) ← `data/huggingface.json`（70 款，API 组：`openai-completions` (70)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
huggingfaceProvider()
  createProvider({
    id: "huggingface",
    name: "Hugging Face",
    auth: ...,
    models: Object.values(HUGGINGFACE_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "huggingface"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`huggingfaceProvider(): Provider<"openai-completions">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** `https://router.huggingface.co/v1`

**鉴权：** `envApiKeyAuth("Hugging Face token", ["HF_TOKEN"])`

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`huggingfaceProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("huggingface", id)` **不**调用本函数，读 `MODELS["huggingface"]`（即 HUGGINGFACE_MODELS）。`BuiltinProvider` 含 `"huggingface"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

id 是 Hub 风格 `Qwen/Qwen3-Coder-...`。70 款里 56 款 reasoning。路由器背后是多家推理后端，失败模式是路由错误而不是「HF 没这模型」——那是协议/HTTP 层的事，工厂只提供目录。

当前目录样本：`MiniMaxAI/MiniMax-M2`、`MiniMaxAI/MiniMax-M2.1`、`MiniMaxAI/MiniMax-M2.5`、`MiniMaxAI/MiniMax-M2.7`、`MiniMaxAI/MiniMax-M3`、`Qwen/Qwen2.5-Coder-32B-Instruct`、`Qwen/Qwen3-235B-A22B`、`Qwen/Qwen3-235B-A22B-Instruct-2507`、`Qwen/Qwen3-235B-A22B-Thinking-2507`、`Qwen/Qwen3-30B-A3B`。模型表里的 `baseUrl` 是 `https://router.huggingface.co/v1`。

`models: Object.values(HUGGINGFACE_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`huggingface.models.ts`](/series/pi-source/ai/175-huggingface-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
