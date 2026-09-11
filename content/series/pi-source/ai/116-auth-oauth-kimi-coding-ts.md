---
title: "55 · auth/oauth/kimi-coding.ts — Kimi Code 订阅设备码"
summary: "RFC 8628 JSON 设备码，打 https://auth.kimi.com。toAuth 不设 apiKey，而设 headers: { Authorization: Bearer access }——和「把 token 塞进 "
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/kimi-coding.ts`  
被谁调用：kimi-coding 厂家。host 可用 `KIMI_CODE_OAUTH_HOST` / `KIMI_OAUTH_HOST` 覆盖。

## 本课目标

RFC 8628 JSON 设备码，打 `https://auth.kimi.com`。`toAuth` 不设 apiKey，而设 `headers: { Authorization: Bearer access }`——和「把 token 塞进 SDK apiKey」的家不同。

## 流程

`/api/oauth/device_authorization` → notify（verificationUriComplete 优先，减少用户打码）→ poll `/api/oauth/token`。verification URI 必须是 http(s)，防止 `open` 被骗去开别的协议。

refresh 最多 3 次。请求带 30s timeout `AbortSignal.any`。

## 失败与边界

错误 host 覆盖：login 一开始就网络失败。Bearer 只在 headers：若某 api 实现只看 `options.apiKey` 会以为没登录。kimi 的 completions 实现必须读 Authorization 头或 Models 合并后的 headers。

## 下一课

Radius 网关 OAuth 工厂：[56-auth-oauth-radius.ts.md](/series/pi-source/ai/117-auth-oauth-radius-ts/)。
