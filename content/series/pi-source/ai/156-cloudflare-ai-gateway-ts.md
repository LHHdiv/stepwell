---
title: "cloudflare-ai-gateway.ts — 三协议网关，URL 带账户/Gateway 占位符"
summary: "把这家从三层里拆出来：工厂只负责 Cloudflare AI Gateway 的门牌和钥匙；协议是 三份都先 cloudflareStreams(...) 再包 lazy api；模型表是 cloudflare-ai-gateway.m"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/cloudflare-ai-gateway.ts`  
核心导出：`cloudflareAIGatewayProvider`  
被谁调用：[`all.ts`](/series/pi-source/ai/142-all-ts/) 的 `builtinProviders()`；也可 `import { cloudflareAIGatewayProvider } from "@earendil-works/pi-ai/providers/cloudflare-ai-gateway"`。

## 本课目标

把这家从三层里拆出来：工厂只负责 **Cloudflare AI Gateway** 的门牌和钥匙；协议是 三份都先 `cloudflareStreams(...)` 再包 lazy api；模型表是 [`cloudflare-ai-gateway.models.ts`](/series/pi-source/ai/155-cloudflare-ai-gateway-models-ts/) ← `data/cloudflare-ai-gateway.json`（49 款，API 组：`anthropic-messages` (10)、`openai-completions` (18)、`openai-responses` (21)）。

对照最薄模板 [openai.ts](/series/pi-source/ai/194-openai-ts/)。本文件的 `api` 是 **map**，按 `model.api` 分发。

## 这个文件在系统中的位置

```text
cloudflareAIGatewayProvider()
  createProvider({
    id: "cloudflare-ai-gateway",
    name: "Cloudflare AI Gateway",
    auth: ...,
    models: Object.values(CLOUDFLARE_AI_GATEWAY_MODELS),
    api: ...
  })
  → builtinProviders() → Models.setProvider
       stream 时 applyAuth 用本厂 auth
       createProvider 按 model.api 选协议
```

coding-agent 的 `streamFn` 看到的 `model.provider === "cloudflare-ai-gateway"` 才会进这家。会话 JSONL 记下的是 `provider/modelId`，换厂家等于换这条键。

## 导出什么

`cloudflareAIGatewayProvider(): Provider<CloudflareAIGatewayApi>`。每次调用 `createProvider` 得到新 Provider。静态目录，无 `fetchModels`（动态覆盖数组保持空）。

## 如何鉴权 / baseUrl

**baseUrl：** 厂家不设总 URL。模型表按协议分三条 Cloudflare 路径，含 `{CLOUDFLARE_ACCOUNT_ID}` / `{CLOUDFLARE_GATEWAY_ID}`。

**鉴权：** `cloudflareAIGatewayAuth()`：login 要 key + account id + gateway id。resolve 把 key 放进 `cf-aig-authorization: Bearer`，并**显式把 `Authorization`/`x-api-key` 设成 `null`** 以免下层再塞冲突头。

请求时 `Models.applyAuth`：显式 options 覆盖鉴权结果；`auth.baseUrl` 若存在会覆盖 `model.baseUrl`。标准 env key 路径只填 `apiKey`。

环境变量发现还登记在 `env-api-keys.ts` 的表里，给 compat 旧 `getEnvApiKey` 和状态 UI 用。工厂 `resolve` 是权威。

## 和 all.ts 的关系

`cloudflareAIGatewayProvider` 出现在 `builtinProviders()` 数组。`getBuiltinModel("cloudflare-ai-gateway", id)` **不**调用本函数，读 `MODELS["cloudflare-ai-gateway"]`（即 CLOUDFLARE_AI_GATEWAY_MODELS）。`BuiltinProvider` 含 `"cloudflare-ai-gateway"`。

静态只读 vs 运行时 Provider：数据同源，对象不是同一个。测试里 mock 鉴权应 `setProvider` 自己的实现，而不是改 json。

## 逐步精读

注释写明：`api` map **钉死三份协议**，即使 models.dev 某一天把 `workers-ai/*`（completions）从目录拿掉。若按「当前 json 推断 api 键」，目录空窗期会让 `createProvider` 拒收 openai-completions。

stream 前 `cloudflare-stream.ts` 用鉴权解析出的 env 替换占位符。没配 account/gateway 则 resolve 失败，根本发不出去。

与 Workers AI 是两家：id 不同，Workers AI 不要 gateway id。

当前目录样本：`claude-fable-5`、`claude-haiku-4.5`、`claude-opus-4.5`、`claude-opus-4.6`、`claude-opus-4.7`、`claude-opus-4.8`、`claude-opus-5`、`claude-sonnet-4.5`、`claude-sonnet-4.6`、`claude-sonnet-5`。模型表里出现过这些 `baseUrl`：`https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/anthropic`、`https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/compat`、`https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/openai`。

`models: Object.values(CLOUDFLARE_AI_GATEWAY_MODELS)` 丢掉 Record 键，id 仍在每个 `Model.id`。多协议时 flatten 后仍是一张表，`model.api` 决定 map 里哪份 streams。

## 失败与边界

- 未配置鉴权：构造成功，`streamSimple` 才 `ModelsError("auth")`。
- `model.api` 不在工厂 map 里：`createProvider` 推 stream error `has no API implementation for "..."`。
- 自定义 `models.json` 可以同 id 覆盖/追加模型；`createProvider` 的 baseline 仍是这份内建表。
- 不要把本厂 Model 的 `api` 改成别家协议名再塞回来——分发键是字符串，协议实现不会校验 provider。

## 下一课

模型表：[`cloudflare-ai-gateway.models.ts`](/series/pi-source/ai/155-cloudflare-ai-gateway-models-ts/)。登记册：[all.ts](/series/pi-source/ai/142-all-ts/)。json 总览：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
