---
title: "radius-config.ts — Radius 网关目录的校验与物化"
summary: "Radius 没有 data/radius.json、没有 radius.models.ts。模型列表是网关 GET /v1/config 返回的 JSON。本文件负责：把 URL 规范化、把响应校验成 RadiusGatewayCon"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/radius-config.ts`  
核心导出：`DEFAULT_RADIUS_GATEWAY`、`loadRadiusGatewayConfig`、`getRadiusModels`、`getRadiusModelsFromConfig`、`normalizeRadiusGatewayUrl`、类型 `RadiusGatewayConfig`  
被谁调用：[radius.ts](/series/pi-source/ai/210-radius-ts/) 的 `refreshModels`；OAuth 流程 `auth/oauth/radius.ts` 也会碰到网关 URL。

## 本课目标

Radius **没有** `data/radius.json`、没有 `radius.models.ts`。模型列表是网关 `GET /v1/config` 返回的 JSON。本文件负责：把 URL 规范化、把响应校验成 `RadiusGatewayConfig`、把每条网关模型焊上 `api: "pi-messages"` 和 `provider: id`。

读完应能把「动态模型表」和 generate-models 那条静态流水线分开。

## 这个文件在系统中的位置

```text
radiusProvider().refreshModels
  loadRadiusGatewayConfig(gateway, apiKey, signal)
    fetch(gateway + "/v1/config")
    sanitizeRadiusGatewayConfig
  getRadiusModelsFromConfig(id, config) → Model<"pi-messages">[]
    context.publish({ persist, update })
```

协议是 `pi-messages`（`api/pi-messages.ts`），Pi 自己的消息协议，不是 OpenAI 兼容。网关告诉你 baseUrl 和模型能力，工厂按这个打。

## 导出什么

- `DEFAULT_RADIUS_GATEWAY = "https://radius.pi.dev"`
- `RadiusGatewayModel`：id/name/reasoning/input/cost/contextWindow/maxTokens，可选 `thinkingLevelMap`
- `RadiusGatewayConfig`：`{ baseUrl, models }`
- `RadiusOAuthCredential`：OAuth 凭证上可选挂 `gatewayConfig`（旧实现把目录塞进 token 对象；新路径用 ModelsStore）
- `normalizeRadiusGatewayUrl`：没 scheme 补 `https://`，去掉尾部 `/`
- `getRadiusCredentialConfig`：从旧 OAuth 凭证里 sanitize 出 config
- `getRadiusModelsFromConfig` / `getRadiusModels`
- `loadRadiusGatewayConfig`

## 如何鉴权 / baseUrl

`loadRadiusGatewayConfig`：`Accept: application/json`，若有 apiKey 则 `Authorization: Bearer`。OAuth access 和 API key 在工厂层都当成这个 bearer。

返回的 `config.baseUrl` 写到**每一条** `Model.baseUrl`。厂家对象自己没有固定 baseUrl——网关可以让聊天端点与配置端点不同。

校验失败（非对象、baseUrl 非字符串、models 非数组、单条缺字段）整份 config 丢弃或单条过滤：`sanitize` 失败 throw `Invalid Radius config`；单条 `isRadiusGatewayModel` 失败则从列表拿掉，其它仍可用。

## 和 all.ts 的关系

`all.ts` 调用 `radiusProvider()`，不 import 本文件。`MODELS` 没有 `"radius"` 键，所以 `getBuiltinModel("radius", ...)` 不存在。`export { radiusProvider }` 是给只要 Radius、不要全表的调用方。

`getBuiltinProviders()`（静态）不含 radius；`builtinProviders()`（运行时）含。

## 逐步精读

`isRadiusGatewayModel` 是手写谓词，不引入 zod。cost 必须是非数组对象。`thinkingLevelMap` 可选，不校验内部键——坏 map 会在 `clampThinkingLevel` 时表现出来。

HTTP 非 2xx：throw，带 status 和截到 512 字符的 body，避免把整页 HTML 打进日志。

`getRadiusModels(id, credential)` 在 `refreshModels` 的「无 ModelsStore 旧数据」分支用来导入遗留 OAuth 里缓存的目录，再 `publish` 进新 store。这是迁移，不是主路径。

## 失败与边界

- 网关返回空 `models: []`：sanitize 成功，厂家 `getModels()` 为空。UI 显示已登录但无模型。
- `normalizeRadiusGatewayUrl("radius.example.com")` → `https://radius.example.com`。已经是 `http://localhost:8787` 的保持 http。
- 本文件 `fetch` 用全局 fetch，不走 `options.fetch`。refresh 发生在 stream 之前，自定义 fetch 注入不到这里。测试要 mock 全局或注入网关。

## 下一课

工厂闭包：[radius.ts](/series/pi-source/ai/210-radius-ts/)。协议：`src/api/pi-messages.ts`（不在本目录）。
