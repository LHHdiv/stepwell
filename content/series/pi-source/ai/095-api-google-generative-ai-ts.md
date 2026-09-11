---
title: "34 · api/google-generative-ai.ts — Gemini Developer API"
summary: "看 stream 如何把 GenerateContentResponse 的 parts 交错译成 text/thinking/toolCall，以及 streamSimple 如何按模型代际选择 level vs budget。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/google-generative-ai.ts` + `.lazy.ts`  
被谁调用：`provider === "google"` 且 `api === "google-generative-ai"`。

## 本课目标

看 `stream` 如何把 `GenerateContentResponse` 的 parts 交错译成 text/thinking/toolCall，以及 `streamSimple` 如何按模型代际选择 level vs budget。

## 在系统中的位置

```text
streamSimple
  必须有 apiKey
  无 reasoning → thinking.enabled false
  Gemini 3 / Gemma 4 → thinking.level
  其他 → thinking.budgetTokens

stream
  GoogleGenAI({ apiKey, httpOptions: { baseUrl, headers } })
  buildParams（systemInstruction、contents=convertMessages、tools、thinkingConfig）
  retryGoogleRequest → generateContentStream
  for chunk / for part:
    thought:true → thinking 块（切块时先 end 旧块）
    普通 text → text 块
    functionCall → toolcall_start 立刻 toolcall_end（参数通常一整包）
    thoughtSignature 附在当前块或 toolCall
  finishReason → stopReason
```

Google 经常在同一 chunk 里混 thinking 和 text。`currentBlock` 类型变化时先发 `*_end` 再 `*_start`。这和 Anthropic「一个 index 一种块」不同。

`toolCallCounter` 模块级递增，给不带 id 的 functionCall 造 id。并发两个 stream 会抢计数器——只求进程内唯一，不求稳定。

`stream` 拒绝自定义 `fetch`（SDK 不支持注入）。

## `streamSimple` 预算

`getGoogleBudget` 按 resolved level 和 `thinkingBudgets` 覆盖。Gemini 3 Pro/Flash 不用预算用 level 枚举。

## 失败与边界

缺 key throw。安全过滤 finishReason → stopReason error，Agent 结束这一轮。usage 从 chunk.usageMetadata 累加，`calculateCost`。thoughtSignature 跨块错位会导致下一轮 400，`retainThoughtSignature` 只在块内修补。

## 下一课

Vertex：同一套 parts，不同鉴权：[35-api-google-vertex.ts.md](/series/pi-source/ai/096-api-google-vertex-ts/)。
