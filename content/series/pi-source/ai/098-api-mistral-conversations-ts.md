---
title: "37 · api/mistral-conversations.ts — Mistral 原生 Chat Completions"
summary: "看自写 payload / SSE 如何处理 Mistral 特有的：toolCall id 必须 9 字符、thinking 是 content: [{type:\"thinking\", thinking:[{type:text}]}]"
tags: [pi, ai]
---
源码：`packages/ai/src/api/mistral-conversations.ts` + `.lazy.ts`  
被谁调用：`api === "mistral-conversations"`。不用 OpenAI SDK，自写 fetch + SSE。文件名 conversations 是历史名字，实际打的是 Chat Completions 端点。

## 本课目标

看自写 payload / SSE 如何处理 Mistral 特有的：toolCall id 必须 9 字符、thinking 是 `content: [{type:"thinking", thinking:[{type:text}]}]`、`promptMode: "reasoning"`。

## 在系统中的位置

```text
streamSimple
  clampThinkingLevel；reasoning 模型才设 promptMode/reasoningEffort
stream
  transformMessages + 9 字符 id 规范化
  buildChatPayload
  POST /v1/chat/completions  stream:true
  consumeChatStream
```

## toolCall id

`MISTRAL_TOOL_CALL_ID_LENGTH = 9`。`createMistralToolCallIdNormalizer` 用 `shortHash` 压到 9 个合法字符，同一原 id 稳定映射。跨协议回放否则 400。

## 思考

`streamSimple`：`shouldUseReasoning = model.reasoning && reasoning !== undefined`。打开时 `promptMode: "reasoning"`，effort 映射成 Mistral 的 `"none" | "high"`（pi 的 medium 等被 clamp 后对应）。

SSE 里 content 可能是字符串或 chunk 数组。`type === "thinking"` 的 chunk 进 thinking 块。

## 错误体

不经 SDK，自己读非 2xx body，截断 `MAX_MISTRAL_ERROR_BODY_CHARS`。`formatMistralError` 给 overflow 检测提供 “too large for model with N maximum context length” 那种句子。

## 失败与边界

缺 key throw。SSE 无 finish_reason → throw pending。id 规范化碰撞理论上可能（9 字符哈希），同一会话内工具次数有限，实际罕见。

## 下一课

pi 自己的网关协议：[38-api-pi-messages.ts.md](/series/pi-source/ai/099-api-pi-messages-ts/)。
