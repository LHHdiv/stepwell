---
title: "53 · auth/oauth/openai-codex.ts — ChatGPT Plus/Pro 登录"
summary: "两种登录：浏览器 loopback（http://localhost:1455/auth/callback，和官方 Codex CLI 同端口）或 device code。token 在 auth.openai.com。toAuth 只"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/openai-codex.ts`  
被谁调用：openai-codex 厂家。access JWT 里的 `chatgpt_account_id` 给 Codex 请求头用。

## 本课目标

两种登录：浏览器 loopback（`http://localhost:1455/auth/callback`，和官方 Codex CLI 同端口）或 device code。token 在 `auth.openai.com`。`toAuth` 只给 `{ apiKey: access }`，account id 由 api 层从 JWT 再解析。

## 流程要点

`login` 先 `select` browser / device_code。浏览器路径 PKCE + 本机 server + 手动粘贴竞速，和 Anthropic 同构。device 路径：`/api/accounts/deviceauth/usercode` 然后 poll token，再把 authorization code 换成真正的 OAuth tokens。

`refresh` 用 refresh_token。`expires` 带 skew。

CLIENT_ID 是公开的 Codex 应用 id。SCOPE 含 `offline_access`。

## 失败与边界

1455 被官方 Codex CLI 占用：listen 失败。JWT 没有 account claim：后续 stream 401。device 超时 15 分钟。`PI_OAUTH_CALLBACK_HOST` 可改绑定地址（WSL 有时需要 0.0.0.0，但 redirect_uri 仍是 localhost——浏览器必须能打开它）。

## 下一课

OpenRouter 换永久 API key：[54-auth-oauth-openrouter.ts.md](/series/pi-source/ai/115-auth-oauth-openrouter-ts/)。
