---
title: "33 · api/google-shared.ts — Gemini / Vertex 的消息与思考"
summary: "记住：thought: true 才是思考块；thoughtSignature 可以打在任何 Part 上（含 functionCall），不是思考的标记。回放必须原样保留带签名的 part，不能把签名挪到别的块。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/google-shared.ts`  
被谁调用：`google-generative-ai.ts`、`google-vertex.ts`。两家 SDK 都是 `@google/genai`，Content/Part 形状相同。

## 本课目标

记住：`thought: true` 才是思考块；`thoughtSignature` 可以打在**任何** Part 上（含 functionCall），不是思考的标记。回放必须原样保留带签名的 part，不能把签名挪到别的块。

## 思考档

`resolveGoogleThinkingLevel`：`off` 对 Google 来说仍映射到 `"high"`（Google 没有真正的 off 对应，调用方要关思考走 `thinking.enabled: false`）。map 里的字符串转小写后必须是 minimal/low/medium/high，否则 throw。

Gemini 3 / Gemma 4 用 `ThinkingLevel` 枚举；旧模型用 `budgetTokens`（-1 dynamic，0 关）。

## `isThinkingPart` / `retainThoughtSignature`

流式时有的后端只在第一包带 signature，后续 delta 省略。`retainThoughtSignature` 在同一块内保留上次非空值，**不**跨块合并。

回放：签名必须是合法 base64（`TYPE_BYTES`）。跨模型或非法签名丢掉，避免 400。

## `convertMessages`

`transformMessages` + 按角色合成 `Content[]`。user/model 交替。连续同角色会合并进同一 Content（Gemini 要求严格交替时，实现里按条 push，依赖厂家容忍）。

toolCall → `functionCall` part，id 在 Gemini 3 / Claude-via-Vertex / gpt-oss 上必填，非法字符换成 `_`、截 64。

toolResult → `functionResponse`。Gemini 3+ 允许把图片放进 functionResponse；更旧的把图提出来当后续 user 部分。

空文本 part 仍可能带着 thoughtSignature，必须保留（`signed empty blocks` 测试）。

## `convertTools`

默认 `parametersJsonSchema`（完整 JSON Schema）。`useParameters: true` 走 OpenAPI 3 子集（Cloud Code Assist 把 Claude 的 input_schema 从 `parameters` 翻译）。strict 时先 `makeStrictJsonSchema`。Gemini 3+ `supportsGoogleStrictToolSampling` 为 true，function calling mode 可到 `VALIDATED`。

## `mapStopReason`

`STOP` → stop；`MAX_TOKENS` → length；安全过滤、畸形 function call 等 → error。未处理的枚举走 exhaustive check throw。

## `retryGoogleRequest`

SDK 的 `ApiError` 有 `status` 无 `headers`，`retryProviderRequest` 认不出。这里补 `headers: undefined` 再扔出去，408/429/5xx 才能重试。

## 失败与边界

非法 thinkingLevel mapping：streamSimple 同步 throw（在发请求前）。签名非法：回放当没签名，多轮思考连贯性丢了但请求能发。`custom fetch` 两家都不支持，stream 里显式 throw。

## 下一课

Gemini API key 路径：[34-api-google-generative-ai.ts.md](/series/pi-source/ai/095-api-google-generative-ai-ts/)。
