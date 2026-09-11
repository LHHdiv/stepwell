---
title: "15 · compat/extension-oauth-types.ts — 旧扩展 OAuth 回调"
summary: "分清两套登录 UI 合约：扩展仍写 onAuth / onDeviceCode / onPrompt；包内部厂家实现写 interaction.notify + interaction.prompt。本文件是旧的那套形状，没有函数。"
tags: [pi, ai]
---
源码：`packages/ai/src/compat/extension-oauth-types.ts`  
被谁调用：`oauth.ts` 与 `index.ts` 的 type re-export；coding-agent 把扩展的 `OAuthLoginCallbacks` 适配成内部 `AuthInteraction`。

## 本课目标

分清两套登录 UI 合约：扩展仍写 `onAuth` / `onDeviceCode` / `onPrompt`；包内部厂家实现写 `interaction.notify` + `interaction.prompt`。本文件是旧的那套形状，没有函数。

## 在系统中的位置

```text
扩展 registerProvider({ oauth: { login(callbacks: OAuthLoginCallbacks) } })
  coding-agent 适配器
    厂家 OAuthAuth.login(AuthInteraction)
```

新厂家实现不要依赖本文件。

## 类型

| 类型 | 用途 |
|---|---|
| `OAuthPrompt` | 一行输入：message / placeholder / allowEmpty |
| `OAuthAuthInfo` | 打开浏览器的 url + instructions |
| `OAuthDeviceCodeInfo` | userCode、verificationUri、轮询间隔与过期 |
| `OAuthSelectOption` / `OAuthSelectPrompt` | 选登录方式（Codex 浏览器 vs device code） |
| `OAuthLoginCallbacks` | `onAuth`、`onDeviceCode`、`onPrompt`、可选 `onProgress` / `onManualCodeInput`、`onSelect`、`signal` |
| `OAuthCredentials` | 从 `auth/types.ts` 再导出：refresh / access / expires |

`onManualCodeInput`：loopback 服务器到不了时（SSH 远程），让用户粘贴 redirect URL。新 `AuthInteraction` 把这变成 `prompt({ type: "manual_code" })` 与 callback 竞速。

## 失败与边界

纯类型。`OAuthCredentials` 允许 `[key: string]: unknown`，Copilot 往上挂 `enterpriseUrl`、`availableModelIds`。

## 下一课

图像子系统从 [16-images.ts.md](/series/pi-source/ai/077-images-ts/) 开始，和聊天 stream 平行。
