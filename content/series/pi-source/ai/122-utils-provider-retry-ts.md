---
title: "61 · utils/provider-retry.ts — 可被 abort 的 HTTP 重试"
summary: "只重试带 status + headers 的 Error：408/409/429/5xx，或头 x-should-retry: true。retry-after / retry-after-ms 优先；否则 0.5s×2^n 封顶 8"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/provider-retry.ts`  
被谁调用：各 `stream` 里 `retryProviderRequest(() => client.xxx.create(..., { maxRetries: 0 }))`。SDK 自带重试的 sleep **不理 AbortSignal**，所以一律 `maxRetries: 0` 外包本函数。

## 本课目标

只重试带 `status` + `headers` 的 Error：408/409/429/5xx，或头 `x-should-retry: true`。`retry-after` / `retry-after-ms` 优先；否则 0.5s×2^n 封顶 8s 再减 0–25% jitter。

服务器要等的时间 > `maxRetryDelayMs`（默认 60s）：**立刻 throw**，文案含 “retry delay”，让 60 课的 Agent 重试来做可见的长等待。设 0 关闭上限。

## 失败与边界

Google 的 ApiError 缺 headers：33 课补 `headers: undefined` 后，status 5xx 可重试（`headers === undefined` 合法）。无 status 的 Error：`isRetryableProviderError` 在 status undefined 时返回 true——网络错误也能重试。abort 中途 → `AbortError` `Request aborted`。

默认 `maxRetries: 0`：调用方不传则**不重试**。产品必须从 settings 传入。

## 下一课

上下文溢出识别：[62-utils-overflow.ts.md](/series/pi-source/ai/123-utils-overflow-ts/)。
