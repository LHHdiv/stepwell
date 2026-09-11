---
title: "28 · api/openai-completions.ts — Chat Completions 方言大全"
summary: "看清 OpenAICompletionsCompat 如何把「一个 chunk 循环」适配几十个网关：思考字段名、maxtokens vs maxcompletiontokens、要不要 finishreason、工具 JSON 怎么拼"
tags: [pi, ai]
---
源码：`packages/ai/src/api/openai-completions.ts`（约 1717 行）+ `openai-completions.lazy.ts`  
被谁调用：`api === "openai-completions"` 的模型——官方 GPT（旧）、DeepSeek、Groq、Cerebras、Together、vLLM、llama.cpp、OpenRouter 的 completions 路由、大量 `models.json` 自定义厂家。

## 本课目标

看清 `OpenAICompletionsCompat` 如何把「一个 chunk 循环」适配几十个网关：思考字段名、max_tokens vs max_completion_tokens、要不要 finish_reason、工具 JSON 怎么拼。chunk → 统一事件的对照表要能默写。

## 在系统中的位置

```text
streamSimple
  getClientApiKey
  clampThinkingLevel → reasoningEffort
  stream(..., { reasoningEffort, thinkingBudgets })

stream
  getCompat(model)          // URL / provider 探测 + model.compat 覆盖
  createClient              // Copilot 头、session affinity
  buildParams               // convertMessages + thinkingFormat 分支
  onPayload
  retryProviderRequest → chat.completions.create.withResponse()
  for await chunk
    delta.content → text_*
    reasoning_content|reasoning|reasoning_text → thinking_*
    delta.tool_calls → toolcall_*
    finish_reason → stopReason
  所有块 finishBlock → done
```

## `streamSimple`

几乎是透传：`toolChoice` 原样（simple 层只有 auto/none，但 Options 类型更宽）。`reasoning === "off"` 或未设 → 不发 `reasoningEffort`。真正的思考 JSON 形状由 `compat.thinkingFormat` 在 `buildParams` 决定。

## `getCompat`（自动探测）

未设置的字段从 `baseUrl` / `provider` 猜。典型默认：OpenAI 官方用 `max_completion_tokens`、支持 developer 角色和 reasoning_effort；llama.cpp 可能 `requiresThinkingAsText`；OpenRouter 开 session affinity 和 `openrouter` thinking 格式。`model.compat` 整字段覆盖。生成目录已经给每家填好，自定义厂家才靠 URL 猜。

## chunk 循环（统一事件）

OpenAI 的流不是 Anthropic 那种显式 start/stop block。本文件自己维护「当前 textBlock / thinkingBlock / toolCall map」：

| 厂家字段 | 统一事件 |
|---|---|
| 第一次非空 `delta.content` | 若还没有 text 块：`text_start`，再 `text_delta` |
| 后续 content | `text_delta` |
| 第一个非空 `reasoning_content` / `reasoning` / `reasoning_text` | `thinking_start` + `thinking_delta`。多个字段同时来只取第一个，避免 chutes.ai 双份 |
| `delta.tool_calls[]` | 按 `index` 或 `id` 找块；没有则 `toolcall_start`；arguments 字符串追加到 `partialArgs`，`parseStreamingJson`；custom grammar 走 `appendGrammarToolInputJsonDelta` |
| `delta.reasoning_details[]` | 不发事件，merge 进内存，thinking_end 时写入 `thinkingSignature`（OpenRouter 回放） |
| `choice.finish_reason` | 映射 stopReason |
| 流结束 | 对每个块 `finishBlock` → `*_end`，再 `done` |

`supportsFinishReason === false` 的网关：流结束时若有 toolCall 则 `toolUse`，否则 `stop`。否则没有 finish_reason 当协议错误。

`chunk.model !== model.id` 时记下 `responseModel`（路由到别的具体模型）。`chunk.id` 当 `responseId`。

Moonshot 把 usage 放在 `choice.usage`：没有 `chunk.usage` 时用它。

## `convertMessages` 的兼容坑

- 系统提示：reasoning 模型且 `supportsDeveloperRole` → `developer`，否则 `system`。
- `requiresAssistantAfterToolResult`：tool 结果后不能直接 user，插一句 `"I have processed the tool results."`。
- 思考回放：`requiresThinkingAsText` 则思考变普通 text（不要 XML 标签，模型会学）；否则写入 `reasoning_content` 或 signature 指定的字段。
- `reasoning_details` 优先于裸 reasoning 字段（OpenRouter 结构化回放）。
- 空助手（abort 后没内容也没 tool）整条跳过，避免「content 和 tool_calls 都没有」。
- toolCall id：`call_id|item_id` 压成 ≤40 的 Completions id，必要时 `shortHash`。
- tool 结果：`requiresToolResultName` 时带 `name`。
- Kimi deferred：`deferredToolsMode === "kimi"` 时用过 `addedToolNames` 的工具不进 `params.tools`，另有 system tools 消息。

## `buildParams` 的 thinkingFormat

| format | 请求体 |
|---|---|
| openai | `reasoning_effort` |
| openrouter | `reasoning: { effort }` |
| deepseek | `thinking: { type }` + 可选 effort |
| zai | `thinking: { type: enabled/disabled }` |
| qwen | 顶层 `enable_thinking` |
| qwen-chat-template | `chat_template_kwargs.enable_thinking` |
| chat-template / baseten | 用 `$var` 填 thinking.enabled/effort/budget |
| string-thinking | 顶层 `thinking: "high"` |
| ant-ling | 仅当 map 的 effort 非 null 才发 `reasoning: { effort }` |

`thinkingTokenBudgetField` 给 vLLM/SGLang/llama.cpp 发思考 token 上限，并 `clampThinkingBudgetToAnswerRoom`，防止思考吃光 `max_tokens`。

最后 `Object.assign(params, samplingParams)`，自定义 `top_k` 等覆盖同名键。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 缺 key | `getClientApiKey` throw |
| 流无 finish_reason 且 compat 要求有 | throw → error 事件 |
| 工具 JSON 不完整 | parseStreamingJson 尽力；finishBlock 再 parse 一次 |
| `store: true` 被 compat.supportsStore 关掉 | 默认 `store: false` 以免厂家存对话 |
| abort | catch 里 stopReason=aborted，thinking 仍写入 signature 便于调试 |

## 下一课

Responses 三家（官方 / Codex / Azure）共用的转换与译码：[29-api-openai-responses-shared.ts.md](/series/pi-source/ai/090-api-openai-responses-shared-ts/)。
