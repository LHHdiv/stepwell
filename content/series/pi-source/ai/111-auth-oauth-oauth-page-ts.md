---
title: "50 · auth/oauth/oauth-page.ts — loopback 回调 HTML"
summary: "oauthSuccessHtml(message) / oauthErrorHtml(message, details?) 输出深色、带 logo 的静态页。所有插入值经 escapeHtml，防止授权服务器把 HTML 打进 quer"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/oauth-page.ts`  
被谁调用：anthropic / openai-codex / openrouter / radius 的 `http.createServer` 响应。

## 本课目标

`oauthSuccessHtml(message)` / `oauthErrorHtml(message, details?)` 输出深色、带 logo 的静态页。所有插入值经 `escapeHtml`，防止授权服务器把 HTML 打进 query。

没有业务逻辑。callback 服务器负责 200/400 和何时关端口。

## 失败与边界

details 给 error_description 用，`white-space: pre-wrap`。用户关标签页不影响已经在跑的 token 交换。

## 下一课

第一家完整 OAuth：[51-auth-oauth-anthropic.ts.md](/series/pi-source/ai/112-auth-oauth-anthropic-ts/)。
