---
title: "66 · utils/abort-signals.ts — Codex 把用户 abort 和超时并在一起"
summary: "过滤 undefined。0 个：{ cleanup: noop } 没有 signal。1 个：原样返回，cleanup 空。多个：新 AbortController，任一 abort 则 abort 它（带上那个 reason）。已"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/abort-signals.ts`  
被谁调用：`openai-codex-responses.ts`（用户 signal + 连接超时）。

## `combineAbortSignals`

过滤 undefined。0 个：`{ cleanup: noop }` 没有 signal。1 个：原样返回，cleanup 空。多个：新 `AbortController`，任一 abort 则 abort 它（带上那个 reason）。已 aborted 的输入立刻触发。

`cleanup` 必须在请求结束后调，否则 listener 泄漏。返回的 `signal` 在 0 个输入时是 undefined，调用方要处理。

现代平台有 `AbortSignal.any`，本函数额外提供 cleanup 和「全 undefined」语义。Codex 需要在 WS 关掉后拆掉超时 listener。

## 下一课

工具参数校验：[67-utils-validation.ts.md](/series/pi-source/ai/128-utils-validation-ts/)。
