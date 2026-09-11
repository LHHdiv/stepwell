---
title: "51 · auth/oauth/anthropic.ts — Claude Pro/Max 登录"
summary: "PKCE + 本机 http://localhost:53692/callback，与手动粘贴 redirect 竞速。token 在 platform.claude.com/v1/oauth/token。access 是 sk-ant"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/anthropic.ts`  
被谁调用：`loadAnthropicOAuth` → anthropic 工厂的 `lazyOAuth`。

## 本课目标

PKCE + 本机 `http://localhost:53692/callback`，与手动粘贴 redirect 竞速。token 在 `platform.claude.com/v1/oauth/token`。access 是 `sk-ant-oat-...`，anthropic-messages 据此切 Bearer + Claude Code 身份。

## 流程

1. `generatePKCE`，起 callback server（`PI_OAUTH_CALLBACK_HOST` 默认 127.0.0.1）。
2. `notify({ type: "auth_url", url: claude.ai/oauth/authorize?... })`。
3. 竞速：server 等到 `code`+`state`，或 `prompt({ type: "manual_code" })`。
4. `parseAuthorizationInput` 接受完整 URL、`code#state`、querystring、或裸 code。
5. 交换 token。`expires` 存成 `now + expires_in*1000 - 5min`（提前当过期，配合 resolve 的 5 分钟窗）。
6. `toAuth` → `{ apiKey: access }`。

CLIENT_ID 用 `atob` 藏着，减少简单 scrape。scopes 含 `user:inference`、`user:sessions:claude_code` 等。

`getNodeApis` 动态 import `node:http`，非 Node throw。

## 失败与边界

端口占用：listen 失败，login throw。用户在浏览器拒绝：error HTML，waitForCode 失败。refresh 用 refresh_token grant，失败文案带 URL 和 body 便于诊断。state 丢失视为错误。

## 下一课

GitHub Copilot 设备码 + 模型策略：[52-auth-oauth-github-copilot.ts.md](/series/pi-source/ai/113-auth-oauth-github-copilot-ts/)。
