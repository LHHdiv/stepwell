---
title: "25 · api/github-copilot-headers.ts — Copilot 的 X-Initiator 与视觉头"
summary: "Copilot 代理不是普通 OpenAI：它要知道这次请求是用户发起还是 Agent 跟进，有图时必须加 Copilot-Vision-Request。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/github-copilot-headers.ts`  
被谁调用：anthropic-messages、openai-completions、openai-responses 在 `model.provider === "github-copilot"` 时 merge 进默认头。

## 本课目标

Copilot 代理不是普通 OpenAI：它要知道这次请求是用户发起还是 Agent 跟进，有图时必须加 `Copilot-Vision-Request`。

## 函数

`inferCopilotInitiator(messages)`：最后一条不是 `user` → `"agent"`，否则 `"user"`。工具结果后的自动续问是 agent，用户新打字是 user。

`hasCopilotVisionInput`：user 或 toolResult 的 content 数组里有 `type: "image"`。

`buildCopilotDynamicHeaders`：永远带

```
X-Initiator: user|agent
Openai-Intent: conversation-edits
```

有图再加 `Copilot-Vision-Request: true`。

这些头在 `createClient` 里和 `User-Agent`、session 头、调用方 headers 合并，调用方能覆盖。

## 失败与边界

空 messages：最后一条 undefined，当 `"user"`。只有文本图（markdown）不算视觉。Copilot 对缺视觉头的带图请求会拒，所以各协议必须在 Copilot 分支调这个函数。

## 下一课

OpenAI prompt_cache_key 截断：[26-api-openai-prompt-cache.ts.md](/series/pi-source/ai/087-api-openai-prompt-cache-ts/)。
