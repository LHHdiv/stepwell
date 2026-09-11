---
title: "nvidia.ts — NIM，模型自带头 NVCF-POLL-SECONDS"
summary: "把这家从三层里拆出来：工厂只负责 NVIDIA 的门牌和钥匙；协议是 openAICompletionsApi()；模型表是 nvidia.models.ts ← data/nvidia.json（21 款，API 组：openai-c"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/nvidia.ts`  
核心导出：`nvidiaProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { nvidiaProvider } from "@earendil-works/pi-ai/providers/nvidia"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **NVIDIA** 的门牌和钥匙；协议是 `openAICompletionsApi()`；模型表是 [`nvidia.models.ts`](/series/pi-source/ai/189-nvidia-models-ts/) ← `data/nvidia.json`（21 款，API 组：`openai-completions` (21)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
nvidiaProvider()
  createProvider({
    id: "nvidia",
    name: "NVIDIA",
    auth: ...,
    models: Object.values(NVIDIA_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "nvidia"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`nvidiaProvider(): Provider<"openai-completions">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** `https://integrate.api.nvidia.com/v1`

**鉴权：** `envApiKeyAuth("NVIDIA API key", ["NVIDIA_API_KEY"])`

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`nvidiaProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("nvidia", id)` **不**调用本函数，读 `MODELS["nvidia"]`（即 NVIDIA_MODELS）。`BuiltinProvider` 含 `"nvidia"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

21 款。生成脚本给**每条**模型打上 `headers: { "NVCF-POLL-SECONDS": "3600" }`，长推理轮询。工厂 `headers` 字段是空的——头在模型表。部分 id 在 `NVIDIA_NIM_UNSUPPORTED_MODELS` 被生成器排除，所以 json 不是 NIM 全量。

当前目录样本：`deepseek-ai/deepseek-v4-flash-0731`、`deepseek-ai/deepseek-v4-pro-0813`、`google/gemma-3-12b-it`、`google/gemma-3-4b-it`、`meta/llama-3.2-11b-vision-instruct`、`meta/llama-3.2-90b-vision-instruct`、`meta/muse-glimmer-30b`、`minimaxai/minimax-m3`、`mistralai/mistral-7b-instruct-v0.3`、`moonshotai/kimi-k2.6`。模型表里的 `baseUrl` 是 `https://integrate.api.nvidia.com/v1`。

`models: Object.values(NVIDIA_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`nvidia.models.ts`](/series/pi-source/ai/189-nvidia-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
