---
title: "38 · api/pi-messages.ts — 把统一事件再放到网上"
summary: "理解它几乎不做厂家翻译：请求体就是 { model, context, options }，响应是 SSE 的 AssistantMessageEvent 子集。本文件负责 HTTP、错误体、把 wire 事件补成带 partial 的"
tags: [pi, ai]
---
源码：`packages/ai/src/api/pi-messages.ts` + `.lazy.ts`  
被谁调用：Radius 网关、任何 `api: "pi-messages"` 的自定义厂家。这是 **pi 自己的线协议**。

## 本课目标

理解它几乎不做厂家翻译：请求体就是 `{ model, context, options }`，响应是 SSE 的 `AssistantMessageEvent` 子集。本文件负责 HTTP、错误体、把 wire 事件补成带 `partial` 的真事件。

## 在系统中的位置

```text
streamSimple 几乎等于 stream（多传 reasoning/toolChoice/debug）
stream
  POST {baseUrl}/messages
  Authorization: Bearer apiKey
  readPiMessagesEvents(body)
  createEventConverter(model)(piEvent) → 统一事件（补 partial）
```

## Wire 事件 vs 内存事件

`PiMessagesEvent` 没有 `partial` / 完整 `AssistantMessage`。`done` 带 usage、responseId、可选 `rewrite`（网关改写了消息的影响摘要）。转换器在本地累加 content 块，发 `start` 时创建 assistant 骨架，每个 delta 改同一对象，终端事件把 usage/stopReason 填上。

`toolcall_start` 在线上带 `id` 和 `toolName`（本地协议在 start 时 arguments 还是空的）。`thinking_end` 可带 `redacted` 和 signature。

## 错误

非 2xx：读 body，试着 parse `{ error: { message, code, details } }`，抛 `PiMessagesResponseError`（带 diagnosticDetails，catch 后写进 assistant.diagnostics）。流没有终端事件 → throw。catch 里 `createErrorEvent`，aborted 用 signal。

`debug=1` query：请网关返回路由头之类，经 onResponse 给调用方。

## `streamSimple`

不走 `buildBaseOptions` 的 maxTokens 夹逼——夹在网关后面的真实厂家做。本层把 simple 字段放进 JSON `options`。

## 失败与边界

缺 key throw。网关把 Anthropic 400 包成 pi-messages error：overflow 检测依赖 `errorMessage` 字符串仍能匹配。`rewrite` 只做诊断，不改本地 messages（本地发的是改写前的 context）。

## 下一课

Cloudflare URL 模板：[39-api-cloudflare.ts.md](/series/pi-source/ai/100-api-cloudflare-ts/)。
