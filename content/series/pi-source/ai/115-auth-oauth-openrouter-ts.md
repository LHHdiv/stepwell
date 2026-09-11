---
title: "54 · auth/oauth/openrouter.ts — PKCE 换永久 key"
summary: "OpenRouter 的「OAuth」交换到的是用户控制的永久 API key，不是会过期的 access/refresh。因此 refresh 是恒等：return credential。expires 仍要填（类型要求），实现里会设"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/openrouter.ts`  
被谁调用：openrouter 厂家 oauth。

## 本课目标

OpenRouter 的「OAuth」交换到的是**用户控制的永久 API key**，不是会过期的 access/refresh。因此 `refresh` 是恒等：`return credential`。`expires` 仍要填（类型要求），实现里会设一个很远的时间。

## 流程

临时端口 loopback（不是写死 53692）。授权 URL `https://openrouter.ai/auth`。callback 与 manual_code 竞速。`TOKEN_URL = https://openrouter.ai/api/v1/auth/keys` 用 code+verifier 换 key。login 5 分钟超时。

`toAuth` → `{ apiKey: credential.access }`，之后和普通 OPENROUTER_API_KEY 路径一样。

## 失败与边界

refresh 永不网络——key 被用户在网站吊销后，请求 401，需要重新 login。callback 端口每次随机，redirect 必须按实际端口注册（OpenRouter 允许 localhost 任意端口）。

## 下一课

Kimi Code 设备码：[55-auth-oauth-kimi-coding.ts.md](/series/pi-source/ai/116-auth-oauth-kimi-coding-ts/)。
