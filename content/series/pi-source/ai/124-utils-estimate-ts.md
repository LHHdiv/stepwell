---
title: "63 · utils/estimate.ts — 4 字符 ≈ 1 token，优先用真 usage"
summary: "estimateContextTokens 不是从零估整段对话。它找时间戳仍适用于当前前缀的最近一条成功助手 usage（跳过 aborted/error，跳过被更新的 compaction 摘要插在前面的旧 usage），然后只估那之"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/estimate.ts`  
被谁调用：`clampMaxTokensToContext`；TUI 上下文仪表。

## 本课目标

`estimateContextTokens` 不是从零估整段对话。它找**时间戳仍适用于当前前缀**的最近一条成功助手 usage（跳过 aborted/error，跳过被更新的 compaction 摘要插在前面的旧 usage），然后只估那之后的尾巴。工具定义：若 usage 之后有 `addedToolNames`，只加那些新工具的 JSON 长度。

没有可用 usage：估全部 messages + systemPrompt + 全部 tools。

图片按 4800 字符。JSON 失败当 `"[unserializable]"`。

`calculateContextTokens(usage)`：`totalTokens` 或四段之和。

## 失败与边界

中文/代码 token 密度不是 4 chars。这只用于夹 maxTokens 和 UI，不是计费。compaction 插入的摘要若 timestamp 较新，会作废更早的 usage，估计变保守（更大），maxTokens 更小。

## 下一课

把 SDK 错误体抽出来：[64-utils-error-body.ts.md](/series/pi-source/ai/125-utils-error-body-ts/)。
