---
title: "64 · utils/error-body.ts — 403 不要只显示 “no body”"
summary: "代理返回的非 2xx，SDK 经常把真正的 JSON 体放在 error.error / body / $response.body，而 error.message 是 \"403 status code (no body)\"。本文件按厂"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/error-body.ts`  
被谁调用：各协议 catch 里 `formatProviderError(normalizeProviderError(error))`。

## 本课目标

代理返回的非 2xx，SDK 经常把真正的 JSON 体放在 `error.error` / `body` / `$response.body`，而 `error.message` 是 `"403 status code (no body)"`。本文件按厂家字段探测 status 和 body，组成给用户看的字符串。

`isPlainNonEmptyObject`：只接受纯对象。AWS SDK 的 stream wrapper 若 JSON.stringify 会得到 `{_events:...}` 垃圾并**盖掉**真正的 `error.message`（「Input is too long」）。class 实例不当 body。

`messageCarriesBody`：Anthropic 已经把体折进 message 时不要再拼一份。

截断 4000 字符。`safeJsonStringify` 失败则 `String(value)`。

## 失败与边界

探测顺序：Mistral `statusCode`/`body` → openai `status`/`error` → Bedrock `$metadata`/`$response`。新 SDK 改字段要更新本文件。prefix 参数变成 `"OpenAI API error (429): ..."`。

## 下一课

abort 辅助：[65-utils-abort.ts.md](/series/pi-source/ai/126-utils-abort-ts/)。
