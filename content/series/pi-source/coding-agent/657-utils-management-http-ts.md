---
title: "101 · utils/management-http.ts — 管理类 HTTP 重试"
summary: "fetchWithRetry：给版本检查、模型目录、fd/rg 下载。默认再试 2 次。408/425/429/5xx 可重试。timeoutMs 管总预算；attemptTimeoutMs 只杀当前尝试。禁止用于模型推理：那些有语义层"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/management-http.ts`

`fetchWithRetry`：给版本检查、模型目录、fd/rg 下载。默认再试 2 次。408/425/429/5xx 可重试。`timeoutMs` 管总预算；`attemptTimeoutMs` 只杀当前尝试。**禁止**用于模型推理：那些有语义层 retry。

父 signal 或总超时 abort 立即 throw。仅 attempt 超时则重试。丢掉失败 response 的 body 以免占连接。

## 下一课

[102-utils.shell.ts.md](/series/pi-source/coding-agent/659-utils-shell-ts/)
