---
title: "26 · api/openai-prompt-cache.ts — 缓存键最长 64 个字符"
summary: "OpenAI 文档限制 cache key 长度。会话 id 可能是 UUID 或更长的产品 id。本函数按 Unicode 码点截断（Array.from(key)），避免把 surrogate pair 从中间切开。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/openai-prompt-cache.ts`（8 行）  
被谁调用：openai-completions / responses / azure / codex 组 payload 时的 `prompt_cache_key`。

## 本课目标

OpenAI 文档限制 cache key 长度。会话 id 可能是 UUID 或更长的产品 id。本函数按 **Unicode 码点**截断（`Array.from(key)`），避免把 surrogate pair 从中间切开。

`undefined` 原样返回，调用方用它表示「这次不发 cache key」（`cacheRetention === "none"`）。

超长返回前 64 个码点组成的新字符串。没有哈希：截断可能让两个长 id 撞键，产品侧应自己把 sessionId 控制在 64 以内。

## 下一课

第一种完整协议：[27-api-anthropic-messages.ts.md](/series/pi-source/ai/088-api-anthropic-messages-ts/)。SSE 如何变成统一事件，从这里看最清楚。
