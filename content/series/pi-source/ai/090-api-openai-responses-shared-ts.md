---
title: "29 · api/openai-responses-shared.ts — Responses 事件的公共译码"
summary: "把 OpenAI Responses 的 response.outputitem. / response..delta 对照到统一事件。记住 toolCall id 是 callid|itemid——这是跨协议回放时 transform"
tags: [pi, ai]
---
源码：`packages/ai/src/api/openai-responses-shared.ts`（约 793 行）  
被谁调用：`openai-responses.ts`、`azure-openai-responses.ts`、`openai-codex-responses.ts`。三家 HTTP 不同，事件形状相同。

## 本课目标

把 OpenAI Responses 的 `response.output_item.*` / `response.*.delta` 对照到统一事件。记住 toolCall id 是 `call_id|item_id`——这是跨协议回放时 `transformMessages` 要规范化的根源。

## 在系统中的位置

```text
openai-responses.stream  → client.responses.create 流
azure-openai-responses    → AzureOpenAI.responses.create 流
openai-codex-responses    → 自写 SSE/WS，解析成同一套 ResponseStreamEvent
        ↓
processResponsesStream(openaiStream, output, stream, model, options)
        ↓
统一 start 已由调用方发出；本函数灌 text_*/thinking_*/toolcall_* 并填 stopReason/usage
调用方再检查 pending → done
```

## `convertResponsesMessages`

系统提示：reasoning 且 `supportsDeveloperRole !== false` → `developer`。

toolCall id 规范化：

- 当前厂家在 `allowedToolCallProviders`（openai / openai-codex / opencode，Azure 再加上自己）且 id 含 `|`：保留 `callId|itemId`，itemId 必须 `fc_` 开头；跨厂家来的 itemId 改成 `fc_${shortHash}`。
- 否则压成 `[a-zA-Z0-9_-]` 且截断。

助手回放：

- reasoning item：整段 `thinkingSignature` 是 JSON 序列化的 `ResponseReasoningItem`（含 `encrypted_content`）。同模型原样塞回 `input`。
- 文本：带 `textSignature`（v1 JSON `{v:1,id,phase}` 或旧纯 id）以便 Responses 把同一 message item 续上。`phase === "final_answer"` 影响 stop 判定。
- function_call / custom_tool_call 成对出现，随后 function_call_output。
- deferred tools：`additional-tools` 模式在 toolResult 后插 `additional_tools` 输入项；`tool-search` 模式发 tool search 输出项。

图片：视觉模型才把 tool 图变成 `input_image` data URL，否则纯文本占位。

## `convertResponsesTools`

grammar → `{ type: "custom", format: { type: "grammar", syntax, definition } }`。  
否则 function + 可选 `strict` + `defer_loading`。

## `processResponsesStream` 事件对照

用 `outputIndex` 做槽位，不是 Anthropic 的 content index。

| Responses 事件 | 统一事件 |
|---|---|
| `response.output_item.added` reasoning | `thinking_start` |
| `response.reasoning_summary_text.delta` 等 | `thinking_delta` |
| reasoning item done | 把 item JSON 写入 thinkingSignature；Azure 可能缺 encrypted_content，等 `response.completed` `backfillReasoningSignatures` |
| output_item message | `text_start`；`phase === "final_answer"` 预置 stopReason=stop |
| `response.output_text.delta` | `text_delta` |
| function_call added | `toolcall_start`，id=`${call_id}|${id}` |
| `response.function_call_arguments.delta` | `toolcall_delta`，partialJson |
| custom_tool_call | 同上，但 arguments 走 grammar 包装 |
| `response.completed` / `incomplete` | 填 usage（input 要减去 cached 和 cache_write）、mapStopReason；有 toolCall 且 stop 则改 `toolUse` |
| `response.failed` | 当 error |

`sawTerminalResponseEvent`：没看到 completed/incomplete 就让调用方 throw “ended without a stop reason”。

usage：OpenAI 的 `input_tokens` **包含** cached 和 cache write，本函数减掉再写入 `usage.input`，与 Anthropic 的「input 不含 cache」对齐。`calculateCost` 后可选 `applyServiceTierPricing`（flex 0.5×，priority 2×/2.5×）。

## 失败与边界

| 情况 | 行为 |
|---|---|
| Azure 漏 encrypted_content | completed 时 backfill，否则下一轮 reasoning 回放失败 |
| 外厂家 toolCall 进 Responses | hash 成 fc_ 前缀，避免非法 item id |
| custom tool 流非单调 | appendGrammar… throw |
| incomplete max_output_tokens | stopReason=length，rawStopReason 带具体 reason |

## 下一课

官方 Responses 薄封装：[30-api-openai-responses.ts.md](/series/pi-source/ai/091-api-openai-responses-ts/)。
