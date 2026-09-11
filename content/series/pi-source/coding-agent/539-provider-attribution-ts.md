---
title: "42 · provider-attribution.ts — 请求头里的产品署名"
summary: "部分网关按 Referer / User-Agent 计费或排行。用户关掉 install telemetry（设置或 PITELEMETRY）则不加默认归因头。OpenCode 的 session 头不受这个开关影响。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/provider-attribution.ts`  
被谁调用：sdk 的 `transformHeaders`，在扩展 `before_provider_headers` 之前。

## 本课目标

部分网关按 Referer / User-Agent 计费或排行。用户关掉 install telemetry（设置或 `PI_TELEMETRY`）则**不加**默认归因头。OpenCode 的 session 头不受这个开关影响。

## 默认头（telemetry 开）

| 判定 | 头 |
|---|---|
| openrouter 或 host `openrouter.ai` | HTTP-Referer pi.dev、X-OpenRouter-Title/Categories |
| nvidia 或 NIM host | `X-BILLING-INVOKE-ORIGIN: Pi` |
| cloudflare workers/gateway | `User-Agent: pi-coding-agent` |

判定看 `model.provider` 或 `model.baseUrl` hostname。

## session 头

provider 是 `opencode` / `opencode-go` 或 host `opencode.ai`：`x-opencode-session` + `x-opencode-client: pi`。没有 sessionId 则不加。

## `mergeProviderAttributionHeaders`

顺序：session 头 → 默认归因 → 调用方传入的若干层（后者覆盖同名）。全空返回 undefined。

## 失败与边界

非法 baseUrl 的 `new URL` 失败则不当作该 host。扩展仍可在 after 这一步改头。这不是安全边界，只是礼貌/计费。

## 下一课

[43-runtime-credentials.ts.md](/series/pi-source/coding-agent/541-runtime-credentials-ts/)：进程内 API key 覆盖层。
