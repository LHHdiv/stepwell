---
title: "google-vertex.ts — API key 或 ADC，URL 带 {location}"
summary: "把这家从三层里拆出来：工厂只负责 Google Vertex AI 的门牌和钥匙；协议是 googleVertexApi()；模型表是 google-vertex.models.ts ← data/google-vertex.json（"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/google-vertex.ts`  
核心导出：`googleVertexProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { googleVertexProvider } from "@earendil-works/pi-ai/providers/google-vertex"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Google Vertex AI** 的门牌和钥匙；协议是 `googleVertexApi()`；模型表是 [`google-vertex.models.ts`](/series/pi-source/ai/169-google-vertex-models-ts/) ← `data/google-vertex.json`（14 款，API 组：`google-vertex` (14)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
googleVertexProvider()
  createProvider({
    id: "google-vertex",
    name: "Google Vertex AI",
    auth: ...,
    models: Object.values(GOOGLE_VERTEX_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "google-vertex"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`googleVertexProvider(): Provider<"google-vertex">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 厂家不设。模型表 `https://{location}-aiplatform.googleapis.com`，location 来自 env。

**鉴权：** 自定义 `vertexAuth`：login 三选一（API key / ADC / service account 文件）。resolve：有 key（存的或 `GOOGLE_CLOUD_API_KEY`）则当 apiKey；否则检查 ADC 文件存在 **且** 有 project + location。

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`googleVertexProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("google-vertex", id)` **不**调用本函数，读 `MODELS["google-vertex"]`（即 GOOGLE_VERTEX_MODELS）。`BuiltinProvider` 含 `"google-vertex"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

ADC 路径默认 `~/.config/gcloud/application_default_credentials.json`，可用 `GOOGLE_APPLICATION_CREDENTIALS` 覆盖。project 认 `GOOGLE_CLOUD_PROJECT` 或 `GCLOUD_PROJECT`。缺 location 视为未配置——协议自己读这些 env 拼 URL，工厂只负责「配齐了没有」。

14 款 Gemini。`gemini-3.1-pro-preview-customtools` 这类变体是目录级 id，不是工厂分支。

当前目录样本：`gemini-2.5-flash`、`gemini-2.5-flash-lite`、`gemini-2.5-pro`、`gemini-3-flash-preview`、`gemini-3.1-flash-lite`、`gemini-3.1-pro-preview`、`gemini-3.1-pro-preview-customtools`、`gemini-3.5-flash`、`gemini-3.5-flash-lite`、`gemini-3.6-flash`。模型表里的 `baseUrl` 是 `https://{location}-aiplatform.googleapis.com`。

`models: Object.values(GOOGLE_VERTEX_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`google-vertex.models.ts`](/series/pi-source/ai/169-google-vertex-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
