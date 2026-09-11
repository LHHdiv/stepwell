---
title: "52 · auth/oauth/github-copilot.ts — Device flow 与 proxy-ep"
summary: "两步 token：GitHub device code 拿到 GitHub access，再换 Copilot token（短命）。toAuth 从 Copilot token 的 proxy-ep= 解析 baseUrl（proxy."
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/github-copilot.ts`  
被谁调用：github-copilot 厂家 oauth。

## 本课目标

两步 token：GitHub device code 拿到 GitHub access，再换 Copilot token（短命）。`toAuth` 从 Copilot token 的 `proxy-ep=` 解析 `baseUrl`（`proxy.xxx` → `https://api.xxx`）。企业 GitHub 要用户输入 hostname。

## 流程

1. 可选企业域名 prompt。
2. `POST /login/device/code`（client_id atob 编码）。
3. `notify` device_code，`pollOAuthDeviceCodeFlow` 换 GitHub access_token。
4. `POST api.{domain}/copilot_internal/v2/token` 换 Copilot access + expires。refresh 字段存的是 **GitHub** token，因为 Copilot token 不能自己 refresh。
5. 拉模型列表；策略里关掉的模型尝试 enable（最多补一批 id 进 `availableModelIds`）。
6. `toAuth`：`{ apiKey: copilotAccess, baseUrl }`。

请求头伪装 VS Code Copilot Chat（User-Agent、Editor-Version、Copilot-Integration-Id）。这是 Copilot API 的准入，不是随意的。

## 失败与边界

企业域名输错：device code URL 404。GitHub token 过期：refresh 整条链失败，需重新 login。`filterModels` 用 `availableModelIds`（厂家侧，本课表不写）。无 proxy-ep 时 fallback 默认 api host。

## 下一课

ChatGPT 订阅：[53-auth-oauth-openai-codex.ts.md](/series/pi-source/ai/114-auth-oauth-openai-codex-ts/)。
