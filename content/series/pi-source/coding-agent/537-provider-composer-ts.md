---
title: "41 · provider-composer.ts — 内置 × models.json × 扩展"
summary: "组出来的 Provider 仍是 pi-ai 的接口。凭证不在这一层读取：只声明 apiKey/oauth 怎么解析。真正的 key 在请求时 resolveConfigValue。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/provider-composer.ts`  
被谁调用：`ModelRuntime.rebuildProviders`；扩展 `registerProvider` 前的 `validateExtensionProvider`。

## 本课目标

组出来的 `Provider` 仍是 pi-ai 的接口。凭证**不在**这一层读取：只声明 apiKey/oauth 怎么解析。真正的 key 在请求时 `resolveConfigValue`。

## `composeModelProvider`

`getModels()` 顺序：

1. base（内置或 native 扩展）的模型
2. models.json 的 models 列表 upsert
3. 扩展 config 的 models 替换/追加
4. 扩展 oauth.modifyModels（登录后）
5. **最后** `modelOverrides[id]`（用户点名覆盖窗口/价/头）

stream：扩展若登记了 `streamSimple` 且 `model.api === extension.api`，走扩展；否则 base 支持该 api 走 base；再否则 `getApiProvider(model.api)` 通用实现。

没有 apiKey 也没有 oauth → throw「no authentication method configured」。扩展只给 streamSimple 不给 api → `validateExtensionProvider` 先炸。

## 认证组合

`composeApiKeyAuth` / `composeOAuthAuth`：扩展声明、models.json `apiKey`/`oauth: "radius"`、内置 oauth。`configuredRequestAuthStatus` 给 UI 显示「已配置但未登录」。

`resolveConfiguredModelHeaders`：该模型在 json/扩展里的 headers，值走 `resolveHeaders`（可 `$ENV` / `!cmd`）。

## 失败与边界

`getModels()` 在 compose 时立刻跑一遍，登记期就能报 schema 错。oauth.modifyModels 在没 credential 时不跑。stream 用 `lazyStream`，真正打电话迟到第一次 iterate。

## 下一课

[42-provider-attribution.ts.md](/series/pi-source/coding-agent/539-provider-attribution-ts/)：发给 OpenRouter 等的产品归因头。
