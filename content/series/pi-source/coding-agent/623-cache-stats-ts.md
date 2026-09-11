---
title: "84 · cache-stats.ts — prompt cache 浪费了多少钱"
summary: "比较「上一轮 prompt 代币」和「本轮 cacheRead」。本应命中却按 input/cacheWrite 计价的部分叫 miss。噪声地板 1024 token。Anthropic 默认 TTL 5 分钟，idle 超过这个在 "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/cache-stats.ts`  
被谁调用：交互 transcript 在 assistant `message_end` 后 `detectCacheMiss`；resume 重建时 `collectCacheMisses`。

## 本课目标

比较「上一轮 prompt 代币」和「本轮 cacheRead」。本应命中却按 input/cacheWrite 计价的部分叫 miss。噪声地板 1024 token。Anthropic 默认 TTL 5 分钟，idle 超过这个在 UI 上提示。

压缩/分支摘要条目重置 prev（上下文合法变了）。**换模型不重置**：整份 prompt 重计费要算浪费。

从未报告过 cache 的厂家（cacheRead+Write 一直 0）不计数，避免把「不支持 cache」当成全 miss。一旦某轮报告过，之后的零 cache 当 miss（OpenAI 风格只报 read）。

`detectCacheMiss(entries, message)` 假定 message **还没** append（message_end 在持久化前）。

## 下一课

[85-defaults.ts.md](/series/pi-source/coding-agent/625-defaults-ts/)。
