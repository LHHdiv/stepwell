---
title: "27 · api/anthropic-messages.ts — Messages API 的 SSE 译码"
summary: "跟完一次请求：streamSimple 如何把 reasoning 变成 thinkingEnabled/effort/thinkingBudgetTokens；stream 如何自写 SSE 解析（不用 SDK 的 event ite"
tags: [pi, ai]
---
源码：`packages/ai/src/api/anthropic-messages.ts`（约 1490 行）+ `anthropic-messages.lazy.ts`  
懒加载：`anthropicMessagesApi = () => lazyApi(() => import("./anthropic-messages.ts"))`  
被谁调用：所有 `api === "anthropic-messages"` 的模型（官方 Anthropic、OpenRouter 上的 Claude、Fireworks、部分 Copilot）。

## 本课目标

跟完一次请求：`streamSimple` 如何把 `reasoning` 变成 `thinkingEnabled`/`effort`/`thinkingBudgetTokens`；`stream` 如何自写 SSE 解析（不用 SDK 的 event iterator）；`content_block_*` 如何变成 `text_*` / `thinking_*` / `toolcall_*`。这是「统一事件」的范文。

## 在系统中的位置

```text
streamSimple(model, context, { reasoning, ... })
  assertRequestAuth          // 缺 key 同步 throw（直接调用时）
  buildBaseOptions
  无 reasoning → stream(..., thinkingEnabled: false)
  forceAdaptiveThinking → stream(..., thinkingEnabled, effort)
  否则预算思考 → adjustMaxTokensForThinking → stream(..., thinkingBudgetTokens)

stream
  createClient（API key / OAuth sk-ant-oat / Copilot Bearer）
  buildParams（transformMessages、tools、betas、cache_control）
  onPayload 可换 body
  retryProviderRequest → client.beta.messages.create().asResponse()
  iterateAnthropicEvents（自写 SSE）
    message_start → usage + responseId
    content_block_start/delta/stop → 统一事件
    message_delta → stopReason + 最终 usage
  done | catch → error
```

## `streamSimple` 的思考翻译

`mapThinkingLevelToEffort`：先看 `model.thinkingLevelMap`，否则 minimal/low→low，medium→medium，high/xhigh/max→high。

`forceAdaptiveThinking === true`（生成目录给 Opus 4.7+ 等）：发 `thinking.type: "adaptive"` + `output_config.effort`，不发 token 预算。

旧模型：`thinkingEnabled: true` + `thinkingBudgetTokens`，且 `maxTokens` 已被夹过，预算再 `min(budget, maxTokens-1024)`。

无 `options.reasoning`：显式 `thinkingEnabled: false`，避免 SDK/厂家默认打开思考。

## 鉴权三种客户端

`createClient`：

1. **github-copilot**：`apiKey: null, authToken: apiKey`，加 Copilot 动态头。
2. **OAuth**（key 含 `sk-ant-oat`）：Bearer + Claude Code 身份头（`user-agent: claude-cli/2.1.251`、`x-app: cli`）。后续 `buildParams` 会强制 system 第一段为 `"You are Claude Code..."`，工具名映射到 CC 规范大小写（Read/Write/Bash…）。这是订阅条款要求，不是彩蛋。
3. **普通 API key**：`x-api-key`。可选 session affinity 头（OpenRouter 用 `x-session-id`，Fireworks 用 `x-session-affinity`）。

`assertRequestAuth`：没 key 时，`authorization` / `x-api-key` / `cf-aig-authorization` 任一有值也过（binding / 调用方自带头）。

`options.client` 可注入现成 `Anthropic` 实例（Vertex 上的 Anthropic 兼容）。此时跳过 createClient，当非 OAuth。

## 自写 SSE 的原因

SDK 的 iterator 在某些代理下会在 `message_stop` 之前结束，或把 `error` 事件吞掉。本文件：

`iterateSseMessages`：按行解析 `event:` / `data:`，空行 flush，`:` 开头是注释。abort signal 在 read 循环里检查。

`iterateAnthropicEvents`：只认 `ANTHROPIC_MESSAGE_EVENTS` 那六个；`event === "error"` 立刻 throw data；JSON 用 `parseJsonWithRepair`（厂家偶发裸控制字符）。若见过 `message_start` 却没有 `message_stop`，throw `Anthropic stream ended before message_stop`——这是 retry 分类器能认的字符串。

## 事件对照表

| Anthropic SSE | 统一事件 | 备注 |
|---|---|---|
| （HTTP 200 后） | `start` | 空 assistant |
| `content_block_start` text | `text_start` | |
| `content_block_delta` text_delta | `text_delta` | |
| `content_block_start` thinking | `thinking_start` | signature 可能此时就有 |
| `thinking_delta` | `thinking_delta` | |
| `signature_delta` | （无对应事件） | 追加到 thinkingSignature |
| `redacted_thinking` start | `thinking_start` | thinking=`[Reasoning redacted]`，redacted=true，密文在 signature |
| `tool_use` start | `toolcall_start` | OAuth 下工具名从 CC 名映射回本地 |
| `input_json_delta` | `toolcall_delta` | `partialJson` 累积，`parseStreamingJson` 更新 arguments |
| `content_block_stop` | 对应 `*_end` | toolCall 去掉 partialJson |
| `message_start` | （无） | 填 usage、responseId、fallback 模型价 |
| `message_delta` | （无） | stop_reason、最终 usage、thinking_tokens |
| 成功结束 | `done` | |
| throw / abort | `error` | 清掉 index/partialJson 再发 |

块用 Anthropic 的 `event.index` 关联，不是 content 数组下标。`contentIndex` 是我们数组里的位置，给 Agent 用。

`fallback` 类型的 content_block：若已经有输出则 throw（不支持生成中途换模型）；空输出则忽略，等后面的块。

`stopReason === "pending"` 直到 message_delta 带来 stop_reason。没有 stop 就当协议错误。`aborted`/`error` 的 stop 也会 throw 进 catch，统一走 error 事件（避免 done+error 双终态）。

## `buildParams` 要点

- `transformMessages(..., normalizeToolCallId)`。
- `splitDeferredTools`：支持 `tool_reference` 的模型把尚未用过、只在 `addedToolNames` 里出现的工具放到 deferred；立即工具列表为空则全部改回 immediate（不能只发 reference）。
- OAuth：system 前插 Claude Code 身份段，cache_control 打在上面。
- cache_control：短缓存 ephemeral；long + compat 允许则 `ttl: "1h"`。打在 system、最后一个 tool、最后一条 user/assistant/tool 文本上。
- betas：OAuth 加 `claude-code`/`oauth`；工具请求加 fine-grained streaming 或 eager_input_streaming；非 adaptive 思考加 interleaved-thinking；fallback 列表非空加 server-side-fallback；mid-convo effort 加两条 2026-07/08 beta。
- `headers` 里显式 `anthropic-beta: null` 可关掉全部自动 beta。
- `supportsTemperature === false`（Opus 4.7+）不发 temperature。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 缺鉴权 | 直接调用同步 throw；经 lazy 变 error 事件 |
| SSE 提前结束 | throw，error 事件，retry.ts 认 "stream ended before message_stop" |
| 工具 JSON 半截 | parseStreamingJson 尽量给出对象；length 时 Agent 不执行 |
| 服务端 fallback 换模型 | 用 allowedFallbackModels 的价格算 cost |
| input_transformations | 不失败，追加 diagnostic |
| 用户 abort | stopReason aborted |

## 下一课

用得最多的兼容协议：[28-api-openai-completions.ts.md](/series/pi-source/ai/089-api-openai-completions-ts/)。compat 开关比 Anthropic 多一个数量级。
