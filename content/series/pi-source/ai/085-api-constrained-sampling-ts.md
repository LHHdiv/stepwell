---
title: "24 · api/constrained-sampling.ts — strict JSON 与 grammar 工具"
summary: "分清两种约束：jsonschema（厂家 strict: true）和 grammar（OpenAI custom tool + lark/regex）。Agent 在 Tool.constrainedSampling 上声明意图，本文"
tags: [pi, ai]
---
源码：`packages/ai/src/api/constrained-sampling.ts`  
被谁调用：OpenAI completions/responses 转 tools；Anthropic/Google/Mistral/Bedrock 的 strict schema；grammar 工具的流式 JSON 包装。

## 本课目标

分清两种约束：`json_schema`（厂家 `strict: true`）和 `grammar`（OpenAI custom tool + lark/regex）。Agent 在 `Tool.constrainedSampling` 上声明意图，本文件决定能不能发给当前厂家。

## `makeStrictJsonSchema`

厂家的 strict 模式要求：根是 object、`additionalProperties: false`、所有 properties 都在 `required` 里、可选字段用 `anyOf: [T, null]` 表示。不支持 `$ref`、`allOf`、`oneOf`、`not`、tuple `items` 数组、boolean schema 等。

`makeJsonSchemaNodeStrict` 原地改 clone：遇到不支持的键 throw `UnsupportedStrictJsonSchemaError`。可选且本身不容 null 的字段被包一层 anyOf。

## `resolveJsonSchemaStrictSampling(tool, supportsStrictMode)`

- 没配 json_schema → `undefined`（不设 strict）。
- 厂家支持 strict：试 `makeStrictJsonSchema`；成功返回 `true`；失败且 `strict !== "require"` 则退回普通工具；`require` 则 throw 带工具名。
- 厂家不支持：`prefer` 忽略；`require` throw。

`getJsonSchemaToolParameters(tool, strict)`：strict 为 true 才改 schema，否则原样。

## Grammar

`resolveGrammarConstrainedSampling`：要 `supportsOpenAIGrammarTools`。优先 `openai_lark`，否则 `openai_regex`。都没有 → throw。schema 必须正好一个 required string 属性，那个属性名就是 grammar 的 `inputProperty`（模型被约束生成的就是这个字符串）。

不支持 grammar 的厂家：返回 undefined，调用方把工具当普通 function 发（约束丢失，不 throw）。

`createGrammarToolInputProperties`：给 stream 解析器用的 `Map<toolName, inputProperty>`。

## 流式包装

厂家 custom tool 流的是裸字符串，pi 的 `ToolCall.arguments` 必须是 JSON 对象。`appendGrammarToolInputJsonDelta` 把增量字符串包成 `{"input":"..."}` 的 JSON 增量，供 `toolcall_delta` 发给 Agent。

规则：input 必须单调增长（`startsWith`）；关闭后再变会 throw。这保证 `parseStreamingJson` 看到的一直是合法前缀。

## 失败与边界

| 情况 | 行为 |
|---|---|
| schema 用了 $ref 且 strict=require | throw，请求发不出去 |
| schema 不合法但 strict=prefer | 当普通工具 |
| grammar 发给不支持的厂家 | 降级 function tool |
| grammar 流非单调 | throw，stream 变 error |

## 下一课

Copilot 动态头：[25-api-github-copilot-headers.ts.md](/series/pi-source/ai/086-api-github-copilot-headers-ts/)。
