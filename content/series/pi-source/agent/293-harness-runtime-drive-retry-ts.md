---
title: "52 · drive/retry.ts — 退避时刻与可中断睡眠"
summary: "now + retryDelayMs(policy, attempt)，和溢出则 MAXSAFEINTEGER。retryDelayMs 来自 pi-ai（指数退避+封顶）。attempt 是 刚刚失败的那一次（从 1 计），nextA"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/drive/retry.ts`

## `retryNotBefore`

`now + retryDelayMs(policy, attempt)`，和溢出则 `MAX_SAFE_INTEGER`。`retryDelayMs` 来自 pi-ai（指数退避+封顶）。attempt 是 **刚刚失败的那一次**（从 1 计），nextAttempt = attempt+1。

## `waitUntil`

`setTimeout` 分段，单段不超过 2^31-1 ms（JS timer 上限）。abort 用 `signal.reason` reject。已 aborted 立刻 onAbort。

drive 只在 `waitForRetry` 且 gate 仍 open 时调用。gate.signal abort（requestAbort）会叫醒等待，reconcile 接着跑。

## 下一课

[53 · deferred.ts](/series/pi-source/agent/294-harness-runtime-drive-deferred-ts/)。
