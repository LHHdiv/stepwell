---
title: "48 · auth/oauth/pkce.ts — Web Crypto 的 code_verifier"
summary: "32 字节随机 → base64url 当 verifier；SHA-256 再 base64url 当 challenge。不用 node:crypto，Node 20+ 和浏览器都能跑。callback 服务器仍需要 node:ht"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/pkce.ts`  
被谁调用：anthropic、openai-codex、openrouter、radius 的浏览器登录。

## 本课目标

32 字节随机 → base64url 当 verifier；SHA-256 再 base64url 当 challenge。不用 `node:crypto`，Node 20+ 和浏览器都能跑。callback 服务器仍需要 `node:http`，所以整个 login 模块还是 Node-only；PKCE 本身不是。

`base64urlEncode` 手写：`btoa` + 换 `+/` 为 `-_` + 去 padding。

## 失败与边界

无 Web Crypto（极老环境）会 throw。verifier 必须原样存到 code 交换，丢失则 login 失败。

## 下一课

设备码轮询：[49-auth-oauth-device-code.ts.md](/series/pi-source/ai/110-auth-oauth-device-code-ts/)。
