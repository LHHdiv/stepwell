---
title: "minimax-cn.ts — MiniMax 国内站"
summary: "把这家从三层里拆出来：工厂只负责 MiniMax CN 的门牌和钥匙；协议是 anthropicMessagesApi()；模型表是 minimax-cn.models.ts ← data/minimax-cn.json（3 款，API"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/minimax-cn.ts`  
核心导出：`minimaxCnProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { minimaxCnProvider } from "@earendil-works/pi-ai/providers/minimax-cn"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **MiniMax CN** 的门牌和钥匙；协议是 `anthropicMessagesApi()`；模型表是 [`minimax-cn.models.ts`](/series/pi-source/ai/179-minimax-cn-models-ts/) ← `data/minimax-cn.json`（3 款，API 组：`anthropic-messages` (3)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是单份 streams。

## 这个文件在系统中的位置

```text
minimaxCnProvider()
  createProvider({
    id: "minimax-cn",
    name: "MiniMax CN",
    auth: ...,
    models: Object.values(MINIMAX_CN_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "minimax-cn"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`minimaxCnProvider(): Provider<"anthropic-messages">`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** `https://api.minimaxi.com/anthropic`

**鉴权：** `envApiKeyAuth("MiniMax CN API key", ["MINIMAX_CN_API_KEY"])` — 与国际站变量不同

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`minimaxCnProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("minimax-cn", id)` **不**调用本函数，读 `MODELS["minimax-cn"]`（即 MINIMAX_CN_MODELS）。`BuiltinProvider` 含 `"minimax-cn"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

目录与国际站同款 id，端点和钥匙隔离。Agent 会话里记的是 `minimax-cn/MiniMax-M3`，换国际站等于换厂家。

当前目录样本：`MiniMax-M2.7`、`MiniMax-M2.7-highspeed`、`MiniMax-M3`。模型表里的 `baseUrl` 是 `https://api.minimaxi.com/anthropic`。

`models: Object.values(MINIMAX_CN_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`minimax-cn.models.ts`](/series/pi-source/ai/179-minimax-cn-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
