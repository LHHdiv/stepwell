---
title: "36 · api/bedrock-converse-stream.ts — Bedrock ConverseStream"
summary: "ConverseStream 的事件名几乎是 Anthropic 的亲戚：contentBlockStart/Delta/Stop。差别在鉴权（SigV4 / Bearer / profile）、图片走 bytes、redacted r"
tags: [pi, ai]
---
源码：`packages/ai/src/api/bedrock-converse-stream.ts`（约 1325 行）+ `.lazy.ts`  
懒加载：变量 specifier `importNodeOnlyApi("./bedrock-converse-stream.ts")`，避免浏览器 bundler 跟上 AWS SDK。Bun 用 `setBedrockProviderModule`（13 课）。

## 本课目标

ConverseStream 的事件名几乎是 Anthropic 的亲戚：`contentBlockStart/Delta/Stop`。差别在鉴权（SigV4 / Bearer / profile）、图片走 bytes、redacted reasoning 是二进制 chunk、以及 Node HTTP 代理。

## 在系统中的位置

```text
streamSimple
  Claude + adaptive → 透传 reasoning 档
  Claude 旧 → adjustMaxTokensForThinking
  其他（Nova 等）→ 透传 reasoning + thinkingBudgets

stream
  BedrockRuntimeClient（region、profile 优先于环境密钥、可选 bearer、proxy agent）
  middleware：自定义头进 SigV4 签名；deserialize 时调 onResponse
  ConverseStreamCommand
  contentBlock* → 统一事件
  metadata → usage
```

## 鉴权优先级

注释针对 issue #6957：pi 里配置的 `profile` / 凭证上的 `AWS_PROFILE` 必须压过环境里的 `AWS_ACCESS_KEY_ID`。SDK 默认链在 client 上设了 `credentials` 时**不会**再用 profile。所以有显式 profile 时不要塞静态 credentials。

`bearerToken` / `AWS_BEARER_TOKEN_BEDROCK`：不走 SigV4，`Authorization: Bearer`。需要 IAM `bedrock:CallWithBearerToken`。

自定义 `headers` 经 Smithy `build` middleware 注入，这样会被签进 SigV4。`x-amz-*`、`authorization`、`host` 静默丢掉，免得把签名搞坏。

## 事件对照

| ConverseStream | 统一事件 |
|---|---|
| contentBlockStart text | text_start |
| contentBlockDelta text | text_delta |
| reasoningContent / redactedContent | thinking_*；redacted 的 bytes 攒进 `redactedChunks`，stop 时合成 thinkingSignature |
| toolUse start | toolcall_start |
| toolUse input delta | toolcall_delta + parseStreamingJson |
| metadata usage | calculateCost |
| stopReason | 映射；tool use → toolUse |

空文本块用 `"<empty>"` 占位，避免 Bedrock 拒空 content。回放要识别这个占位。

## `streamSimple` 思考

`isAnthropicClaudeModel` + `supportsAdaptiveThinking`：新 Claude 档位思考。旧 Claude 走 token 预算并夹 maxTokens。Amazon Nova 等把 `reasoning` 原样交给 Converse 的 additionalModelRequestFields。

## 代理

`resolveHttpProxyUrlForTarget` + `HttpsProxyAgent` / `HttpProxyAgent` 配 `NodeHttpHandler`。SOCKS 直接报 UNSUPPORTED（72 课）。

## 失败与边界

浏览器没有 AWS SDK：lazy 动态 import 失败 → error 事件。ThrottlingException 文本含 “Too many tokens” 会被 overflow 排除规则挡掉（62 课）。`onPayload` 改的是 Converse 输入文档。region 错 → SDK 抛，normalizeProviderError 抽 `$metadata.httpStatusCode`。

## 下一课

Mistral 原生 Chat：[37-api-mistral-conversations.ts.md](/series/pi-source/ai/098-api-mistral-conversations-ts/)。
