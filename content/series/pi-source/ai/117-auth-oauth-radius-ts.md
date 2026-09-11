---
title: "56 · auth/oauth/radius.ts — 按网关发现端点的 OAuth"
summary: "Radius 是 pi-messages 网关。GET {gateway}/v1/oauth 发现 authorizationEndpoint。token 打在网关上。浏览器回调写死 127.0.0.1:1456/oauth/callb"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/radius.ts`  
被谁调用：`createRadiusOAuth({ name, gateway })`，每套网关一份，不是单例。

## 本课目标

Radius 是 pi-messages 网关。`GET {gateway}/v1/oauth` 发现 `authorizationEndpoint`。token 打在网关上。浏览器回调写死 `127.0.0.1:1456/oauth/callback`。也可 device_code。

## `createRadiusOAuth`

`normalizeRadiusGatewayUrl`（providers 里，本课表不写）清尾斜杠。`login` select browser / device-code。browser：discovery → PKCE → 1456 服务器。device：标准 RFC 设备码 grant `urn:ietf:params:oauth:grant-type:device_code`。

`refresh`：`grant_type=refresh_token`，`client_id=pi-gateway`。`toAuth` → `{ apiKey: access }`，pi-messages 用 Bearer。

`OAuthResponseError` 带 HTTP status 和 oauth error 码，login UI 能显示 `access_denied`。

## 失败与边界

发现文档缺 `authorizationEndpoint`：throw invalid config。1456 占用失败。gateway 用 http 明文：实现允许（本地网关），生产应 https。多网关多份 OAuthAuth，凭证仍按 **provider id** 存一把——两个 Radius 厂家要两个 provider id。

## 下一课

xAI 设备码：[57-auth-oauth-xai.ts.md](/series/pi-source/ai/118-auth-oauth-xai-ts/)。
