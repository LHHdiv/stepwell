---
title: "59 · oauth-selector.ts — 登录/登出选供应商"
summary: "无 session。搜索模糊过滤。确认回调 (providerId, authType)。同一 provider 同时有 oauth 和 apikey 时显示 subscription / API key 标签。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/oauth-selector.ts`  
谁创建：`/login` 选 provider、`/logout`。

## 订阅什么

无 session。搜索模糊过滤。确认回调 `(providerId, authType)`。同一 provider 同时有 oauth 和 api_key 时显示 `subscription` / `API key` 标签。

## 画什么

标题「Select provider to configure/logout」、搜索、列表（名、类型、已配置来源）。`TruncatedText` 防超宽。

`AuthSelectorProvider` 类型和 `formatAuthSelectorProviderType` 给自动补全 `/login ` 复用。

## 失败与边界

logout 列表来自 `listCredentials`，不是「所有可能的 provider」。空列表由调用方先 showStatus 拦截。

## 下一课

[60-login-dialog.ts.md](/series/pi-source/coding-agent/574-login-dialog-ts/)
