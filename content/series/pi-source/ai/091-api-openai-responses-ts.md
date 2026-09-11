---
title: "30 · api/openai-responses.ts — 官方 Responses API 封装"
summary: "看它如何把 shared 的转换接上 OpenAI SDK：client 头、prompt cache 两种模式、reasoning.encryptedcontent、service tier 计价。真正的 SSE 译码在上一课。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/openai-responses.ts` + `openai-responses.lazy.ts`  
被谁调用：`api === "openai-responses"`（官方 GPT-5 系、部分 Copilot、xAI Responses、OpenRouter 的 responses 路由）。

## 本课目标

看它如何把 shared 的转换接上 OpenAI SDK：client 头、prompt cache 两种模式、reasoning.encrypted_content、service tier 计价。真正的 SSE 译码在上一课。

## 在系统中的位置

```text
streamSimple → clampThinkingLevel → reasoningEffort
stream
  getClientApiKey
  createClient（Copilot 头、session_id / x-session-id）
  buildParams
  retryProviderRequest → client.responses.create().withResponse()
  start
  processResponsesStream(..., applyServiceTierPricing)
  校验 stopReason ≠ pending → done
```

## `getCompat` 默认

`supportsDeveloperRole: true`，`supportsStrictMode: false`（生成目录给官方模型显式打开），`supportsMaxOutputTokens: true`。OpenRouter URL → `sessionAffinityFormat: "openrouter"`。

## 缓存

`cacheRetention` 默认 short，`PI_CACHE_RETENTION=long` 兼容旧 env。

- 老模型：`prompt_cache_retention: "24h"`（long 且 supportsLongCacheRetention）。
- GPT-5.6+（`supportsExplicitPromptCacheMode`）：`prompt_cache_options: { ttl: "30m" }` 或 none 时 `{ mode: "explicit" }`。
- `prompt_cache_key` 来自截断后的 sessionId；retention none 则不发 key。

`store: false` 永远带上——Responses 默认可能存会话，pi 要无状态回放（靠 encrypted_content）。

## `buildParams` 思考

有 `reasoningEffort` 或 `reasoningSummary`：发 `reasoning: { effort, summary }` 且 `include: ["reasoning.encrypted_content"]`。  
关掉思考：`thinkingLevelMap.off` 不是 `null` 时发 `effort: "none"`（Copilot 除外，它拒这个）。  
xAI：即使没开 summary 也 `include` encrypted_content，否则下一轮回放没有签名。

`max_output_tokens` 下限 16（OpenAI 拒更小的值）。`splitDeferredTools` + additional_tools / tool-search。

## `streamSimple`

与 completions 相同：off → 不传 effort。不传 `reasoningSummary`，stream 里默认 summary `"auto"`（只要有 effort）。

## 失败与边界

缺 key 同步 throw。流无终端事件 throw。service_tier flex/priority 只改 **cost 显示**，不改 usage token。`onPayload` 可整份替换 params，仍强制走 SDK create。

## 下一课

ChatGPT 订阅走的另一条 Responses：[31-api-openai-codex-responses.ts.md](/series/pi-source/ai/092-api-openai-codex-responses-ts/)。
