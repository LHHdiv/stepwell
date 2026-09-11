---
title: "11 · oauth.ts — 扩展用的类型再导出"
summary: "知道这个入口 零运行时：只把 compat/extension-oauth-types.ts 的旧回调类型再导出。不会加载任何 OAuth 实现、不会起 http 服务器。"
tags: [pi, ai]
---
源码：`packages/ai/src/oauth.ts`（10 行）  
入口：`@earendil-works/pi-ai/oauth`。  
被谁调用：coding-agent 扩展声明自定义 OAuth 时 `import type { OAuthLoginCallbacks } from "@earendil-works/pi-ai/oauth"`。

## 本课目标

知道这个入口 **零运行时**：只把 `compat/extension-oauth-types.ts` 的旧回调类型再导出。不会加载任何 OAuth 实现、不会起 http 服务器。

## 在系统中的位置

```text
扩展源码
  import type { OAuthLoginCallbacks, OAuthPrompt, ... } from "@earendil-works/pi-ai/oauth"
        → compat/extension-oauth-types.ts
        → OAuthCredentials 来自 auth/types.ts
```

实现仍在 `auth/oauth/*.ts`，经厂家工厂的 `lazyOAuth` 加载。扩展作者如果误 `import { anthropicOAuth } from "@earendil-works/pi-ai/oauth"` 会失败——没有这个值。

## 导出清单

`OAuthAuthInfo`、`OAuthCredentials`、`OAuthDeviceCodeInfo`、`OAuthLoginCallbacks`、`OAuthPrompt`、`OAuthSelectOption`、`OAuthSelectPrompt`。

形状见 [15 课](/series/pi-source/ai/076-compat-extension-oauth-types-ts/)。新产品内部用 `AuthInteraction`（`prompt` + `notify`），不再用 `onAuth` / `onDeviceCode` 那套。

## 失败与边界

无运行时失败。type-only 入口在 emit 后是空模块。

## 下一课

Bun 二进制如何把 OAuth 静态焊上：[12-bun-oauth.ts.md](/series/pi-source/ai/073-bun-oauth-ts/)。
