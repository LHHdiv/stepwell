---
title: "02 · types.ts — 全包共用的形状"
summary: "能不看源码说出：一次请求的输入是 Model + Context + SimpleStreamOptions，输出是 AssistantMessageEventStream，事件有哪几种、partial 是什么、stopReason 有"
tags: [pi, ai]
---
源码：`packages/ai/src/types.ts`（约 881 行）  
被谁调用：本包几乎每个文件；`packages/agent` 的 `streamFn` 签名；coding-agent 的 Model / Message 类型。

## 本课目标

能不看源码说出：一次请求的输入是 `Model + Context + SimpleStreamOptions`，输出是 `AssistantMessageEventStream`，事件有哪几种、`partial` 是什么、`stopReason` 有哪些。这是 Agent 世界和厂家世界的边界。

## 在系统中的位置

```text
AgentMessage[]  --convertToLlm-->  Message[]  (本文件)
Context { systemPrompt, messages, tools }
Model { id, api, provider, baseUrl, compat, ... }
        |
        v
streamSimple(model, context, options)
        |
        v
AssistantMessageEvent  (本文件)
  start → text_*/thinking_*/toolcall_* → done | error
        |
        v
AssistantMessage  回到 agent-loop
```

## `Api` 与 `ProviderId` 是两根轴

```ts
export type KnownApi =
  | "openai-completions" | "openai-responses" | "openai-codex-responses"
  | "azure-openai-responses" | "anthropic-messages" | "bedrock-converse-stream"
  | "google-generative-ai" | "google-vertex" | "mistral-conversations"
  | "pi-messages";

export type Api = KnownApi | (string & {});
```

`Api` 是**对话协议**。`ProviderId` 是**谁在卖这个模型**（`anthropic`、`openrouter`、`github-copilot`……）。分发走 `model.api`：OpenRouter 上的 Claude 用 `anthropic-messages`，GitHub Copilot 上的 GPT 可能用 `openai-completions` 或 `openai-responses`。

`(string & {})` 让自定义 api 字符串能通过类型检查，又不会把 `KnownApi` 联合类型冲成纯 `string`。

图像是平行的一套：`KnownImagesApi = "openrouter-images"`。

## `Model<TApi>`

一次请求要知道的全部静态事实：

| 字段 | 干什么 |
|---|---|
| `id` / `name` | 厂家模型名 |
| `api` | 分发键 |
| `provider` | 鉴权、目录、归因头 |
| `baseUrl` | HTTP 终点。OAuth 的 `toAuth` 可以在请求时覆盖（Copilot 从 token 里解析 proxy-ep） |
| `reasoning` | 这款模型会不会思考。false 时 `getSupportedThinkingLevels` 只返回 `off` |
| `thinkingLevelMap` | pi 的 `minimal/low/.../max` 映射到厂家字符串；`null` 表示该档不支持 |
| `input` | `"text"` / `"image"`。`transformMessages` 据此把不支持的图换成占位文本 |
| `cost` | 每百万 token 价，可带 `tiers`（输入超过阈值换价） |
| `contextWindow` / `maxTokens` | `simple-options` 用来夹 `maxTokens` |
| `samplingParams` | 默认采样，请求级覆盖 |
| `headers` | 模型自带的默认头 |
| `compat` | 按 `TApi` 收窄的兼容开关。completions 是一大坨 URL 探测覆盖；responses / anthropic / bedrock 各有自己的接口 |

`compat` 的条件类型值得盯一眼：只有对应协议才允许对应字段。给 `openai-completions` 模型写 `supportsEagerToolInputStreaming` 会是类型错误。

## 请求选项三层

1. `ProviderRequestOptions`：鉴权、fetch、env、headers、timeout、maxRetries、onPayload、onResponse。所有协议共享。
2. `StreamOptions` 再加 temperature、samplingParams、maxTokens、transport、cacheRetention、sessionId、metadata。
3. `SimpleStreamOptions` 再加 **厂家中性** 的 `toolChoice`、`reasoning`、`deferred`、`thinkingBudgets`。

Agent 只该传 `SimpleStreamOptions`。`streamSimple` 的职责就是把它翻译成 `AnthropicOptions.effort` 或 `OpenAIResponsesOptions.reasoningEffort`。

`ApiStreamOptions<TApi>` 用 `ApiOptionsMap` 把已知 api 映射到具体 Options。自定义 api 退回 `StreamOptions & Record<string, unknown>`。

`headers` 的值可以是 `string | null`。`null` 表示**删掉**厂家默认头（Bedrock 绑定 fetch、Copilot 清掉 SDK 自带的 Authorization 时会用）。

## `StreamFunction` 合约（注释写死，所有 api 文件必须遵守）

```ts
export type StreamFunction<TApi, TOptions> = (
  model: Model<TApi>,
  context: Context,
  options?: TOptions,
) => AssistantMessageEventStream;
```

- 必须返回 stream，不能返回 `Promise<stream>`。
- **缺鉴权时允许同步 throw**（`streamSimple` 入口的 `getClientApiKey` / `assertRequestAuth`）。一旦返回了 stream，之后的失败必须编码进事件，不要把未捕获异常扔到 Agent lifecycle。
- 失败终止必须是带 `stopReason: "error" | "aborted"` 的 `AssistantMessage`，经 `error` 事件发出。

`ProviderStreams` 是 api 模块的值形状：`stream` + `streamSimple`，可选 `fetchDeferred` / `cancelDeferred`。`lazyApi()` 和 `createProvider` 都按这个接口传递。

## 消息三种角色

`Message = UserMessage | AssistantMessage | ToolResultMessage`。

**UserMessage**：`content` 是字符串或 `(TextContent | ImageContent)[]`。没有 thinking、没有 toolCall。

**AssistantMessage**：本包的产品。字段比看起来多：

| 字段 | 含义 |
|---|---|
| `content` | `text` / `thinking` / `toolCall` 块数组，顺序就是模型吐出的顺序 |
| `api` / `provider` / `model` | 回放时 `transformMessages` 判断是不是「同一模型」 |
| `responseModel` | 实际回来的模型 id（OpenRouter `auto` → `anthropic/...`） |
| `responseId` | 厂家消息 id，Codex 用来做 previous_response_id |
| `providerThinkingLevel` | 这一轮真正用的 effort，给 mid-convo effort 回放 |
| `diagnostics` | 脱敏后的运行时诊断（Anthropic input_transformations、Codex WS 失败） |
| `usage` | 见下 |
| `stopReason` | 控制流 |
| `deferred` | 异步句柄 |
| `errorMessage` / `rawStopReason` | 失败文本；厂家原始 stop 字符串，调试用 |
| `endTurn` | 厂家说它显式结束了回合。**目前不影响 Agent 控制流** |

**ToolResultMessage**：`toolCallId` 必须对上某个 `ToolCall.id`。`content` 可以带图。`addedToolNames` 是延迟加载工具的挂载点——Anthropic `tool_reference`、OpenAI `additional_tools` 用它。`isError` 告诉模型这次工具失败了，不是 HTTP 失败。

## `Usage`

`input` / `output` / `cacheRead` / `cacheWrite` / 可选 `cacheWrite1h` / 可选 `reasoning` / `totalTokens` / `cost`。

`reasoning` 是 `output` 的子集：厂家报了思考 token 才填。`calculateCost`（`models.ts`）按 `model.cost` 算美元，Anthropic 的 1h cache write 按 2× input 价。

## `StopReason`

```ts
"pending" | "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred"
```

- `pending`：流还没结束。正常路径上 `done` 之前必须改掉，否则各 `stream` 会 throw “ended without a stop reason”。
- `stop`：模型说完了。
- `length`：打到 max tokens。agent-loop 见了会**拒绝执行本批工具**（参数可能被截断）。
- `toolUse`：有 toolCall。内层循环会 `executeToolCalls`。
- `error` / `aborted`：失败。loop 结束。
- `deferred`：厂家给了异步句柄，稍后再 `fetchDeferred`。

`done` 事件的 `reason` 只允许 `stop | length | toolUse | deferred`。`error` 事件的 `reason` 只允许 `aborted | error`。

## 事件协议（必背）

```ts
export type AssistantMessageEvent =
  | { type: "start"; partial: AssistantMessage }
  | { type: "text_start"; contentIndex: number; partial }
  | { type: "text_delta"; contentIndex; delta; partial }
  | { type: "text_end"; contentIndex; content; partial }
  | 同源 thinking_* / toolcall_*
  | { type: "done"; reason; message }
  | { type: "error"; reason; error };
```

规则（文件头注释，测试会查）：

1. 成功流：先 `start`，再局部更新，最后 `done`。
2. 请求还没发出去就失败：可以直接 `error`，不必先 `start`。`start` 之后的失败也是 `error`。
3. `text_start` 时该块文本为空，只通过 `*_delta` 增长，直到 `*_end` 给出权威全文。
4. 被安全过滤的 thinking 可能在 start 时就已经完整，不再发 delta。
5. `toolcall_start` 时 arguments 因厂家而异；完整 JSON 在 `toolcall_end` 才可信。
6. `partial` 是**同一个可变对象**的实时视图，不是快照。agent-loop 靠它更新 UI，不要假设两次事件的 `partial` 是深拷贝。

`AssistantMessageEventStream` 的实现在 [58-utils-event-stream.ts.md](/series/pi-source/ai/119-utils-event-stream-ts/)。

## 内容块

- `TextContent`：可选 `textSignature`（OpenAI Responses 的 message id / phase，JSON 或旧纯字符串）。
- `ThinkingContent`：`thinkingSignature` 是厂家不透明 blob，回放必须原样送回。`redacted: true` 时正文是占位，真正密文在 signature 里。
- `ImageContent`：base64 + mimeType。
- `ToolCall`：`id` / `name` / `arguments`。Google 有 `thoughtSignature`；Responses 有 `namespace`。

跨模型换厂家时，`transformMessages` 会丢掉别家的 signature、规范化 id。

## `Context` 与 `Tool`

```ts
interface Context {
  systemPrompt?: string;
  messages: Message[];
  tools?: Tool[];
}
```

`Tool.parameters` 是 TypeBox `TSchema`。`constrainedSampling` 可选 json_schema strict 或 grammar（lark/regex）。这是请求体里的工具定义，**不是** coding-agent 的 `execute`。

`ToolChoice` 在 simple 层只有 `"auto" | "none"`。厂家 Options 可以更宽（Anthropic 的 `{ type: "tool", name }`）。

## 各协议的 compat 接口

文件后半是四份大接口，生成目录和 `models.json` 覆盖项都往这里填：

- `OpenAICompletionsCompat`：最大。thinkingFormat（openai/openrouter/deepseek/zai/qwen/chat-template…）、maxTokens 字段名、要不要 `store`、工具结果要不要 `name`、session affinity、vLLM priority……几乎每个 OpenAI 兼容网关的怪癖一档开关。
- `OpenAIResponsesCompat`：developer 角色、strict tools、additional_tools、prompt_cache_options。
- `AnthropicMessagesCompat`：eager tool streaming、1h cache、adaptive thinking、empty signature、tool_reference。
- `BedrockCompat`：目前只有 `supportsStrictMode`。

读 api 文件时，先在对应 `getCompat(model)` 看默认值，再看 `model.compat` 如何覆盖。

## 失败与边界

| 情况 | 类型层怎么说 |
|---|---|
| 自定义 api 字符串 | `Api = KnownApi \| (string & {})`，选项退回泛型 |
| 缺 apiKey | `StreamFunction` 允许同步 throw |
| 流中途挂 | 必须 `error` 事件，`stopReason` error/aborted |
| `partial` 被调用方改 | 未定义。它是共享可变对象 |
| `length` 时 tool 参数 | 类型仍是 `Record<string, any>`，可能是半截 JSON。Agent 负责不执行 |

## 下一课

全局分发：[03-compat.ts.md](/series/pi-source/ai/064-compat-ts/)。`streamSimple` 如何按 `model.api` 找到实现，以及为什么 Cloudflare 要绕开 registry 走 `Models`。
