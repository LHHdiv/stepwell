---
title: "60 · utils/retry.ts — 助手消息级的重试"
summary: "isRetryableAssistantError 看 errorMessage 正则：overload、429、502、fetch failed、websocket closed、stream ended before message"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/retry.ts`  
被谁调用：coding-agent 的 streamFn 外层（设置里的 `retry.enabled`）。这是 **整轮再打一次电话**，不是 HTTP 408 那种（那是 61 课）。

## 本课目标

`isRetryableAssistantError` 看 `errorMessage` 正则：overload、429、502、fetch failed、websocket closed、stream ended before message_stop…。**额度/账单**（`insufficient_quota`、`GoUsageLimitError`、`billing`）明确排除。

`retryAssistantCall(produce, policy, signal, callbacks)`：成功或非 error 立即返回；aborted 永不重试；error 且可重试则指数退避 `baseDelayMs * 2^(attempt-1)`，封顶 `maxAgentDelayMs` 默认 60s。退避中 abort → 把消息改成 `stopReason: "aborted"` 返回，调用方不必区分「流里取消」还是「睡的时候取消」。

`policy` undefined 或 `enabled: false`：等于直接 `produce()`。

## 失败与边界

overflow 也是 errorMessage，可能匹配 “too many tokens”——调用方应**先** `isContextOverflow` 再考虑本函数。正则误伤：NON_RETRYABLE 先跑。`onRetryScheduled` 给 TUI 显示「第 2/5 次，等 2s」。

## 下一课

单次 HTTP 的 SDK 风格重试：[61-utils-provider-retry.ts.md](/series/pi-source/ai/122-utils-provider-retry-ts/)。
