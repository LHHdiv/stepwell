---
title: "62 · utils/overflow.ts — 这是窗满了还是普通错误"
summary: "文件注释按厂家列了可靠/不可靠。自定义厂家要加正则。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/overflow.ts`  
被谁调用：coding-agent 压缩决策。本包不自动压缩，只分类。

## 三种溢出

1. `stopReason === "error"` 且 `errorMessage` 匹配 `OVERFLOW_PATTERNS`，且不匹配 `NON_OVERFLOW_PATTERNS`（Bedrock throttling 也含 “Too many tokens”）。
2. 静默溢出：`stopReason === "stop"` 且 `usage.input+cacheRead > contextWindow`（z.ai）。
3. length + 零 output + 输入占满窗的 99%（Xiaomi MiMo 截断输入）。

文件注释按厂家列了可靠/不可靠。自定义厂家要加正则。

`isRecoverableLength(message, desiredMaxOutput)`：`length` 且实际 output 小于调用方原来想要的上限——可能是窗压力，值得压缩再试一次。`desiredMaxOutput` 必须是夹 context 之前的值。

`getOverflowPatterns()` 给测试。

## 失败与边界

没传 contextWindow：2、3 不会触发，z.ai/MiMo 漏检。Cerebras `400 status code (no body)` 会被当成溢出，偶发误伤。调用方应在 retryable 之前判断 overflow，避免把真溢出当 429 重试。

## 下一课

token 估计：[63-utils-estimate.ts.md](/series/pi-source/ai/124-utils-estimate-ts/)。
