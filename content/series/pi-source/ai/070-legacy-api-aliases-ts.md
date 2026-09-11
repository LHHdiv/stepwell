---
title: "09 · legacy-api-aliases.ts — 旧的 per-API 函数名"
summary: "认出这些是 deprecated 别名，全部指向对应 Api().stream / streamSimple。新代码从 @earendil-works/pi-ai/api/anthropic-messages 直接 import，或走 "
tags: [pi, ai]
---
源码：`packages/ai/src/legacy-api-aliases.ts`  
被谁调用：经 `compat.ts` 的 `export *` 出去。CHANGELOG 写过：临时恢复 `streamSimpleOpenAICompletions` 这类名字，免得旧扩展炸。

## 本课目标

认出这些是 **deprecated 别名**，全部指向对应 `*Api().stream` / `streamSimple`。新代码从 `@earendil-works/pi-ai/api/anthropic-messages` 直接 import，或走 `streamSimple(model, ...)` 让 registry 分发。

## 在系统中的位置

```text
compat 入口
  export * from legacy-api-aliases.ts
    const anthropicMessagesStreams = anthropicMessagesApi();  // lazyApi
    export const streamAnthropic = streams.stream
    export const streamSimpleAnthropic = streams.streamSimple
    ... Azure / Google / Vertex / Mistral / Codex / Completions / Responses
```

加载本文件会构造 8 个 lazy wrapper（不加载 SDK）。Bedrock / pi-messages 没有旧别名——它们加入时已经走统一 `streamSimple`。

## 逐个别名

每个协议两对：

| 旧名 | 实际 |
|---|---|
| `streamAnthropic` / `streamSimpleAnthropic` | anthropic-messages |
| `streamAzureOpenAIResponses` / `streamSimpleAzureOpenAIResponses` | azure-openai-responses |
| `streamGoogle` / `streamSimpleGoogle` | google-generative-ai |
| `streamGoogleVertex` / `streamSimpleGoogleVertex` | google-vertex |
| `streamMistral` / `streamSimpleMistral` | mistral-conversations |
| `streamOpenAICodexResponses` / `streamSimpleOpenAICodexResponses` | openai-codex-responses |
| `streamOpenAICompletions` / `streamSimpleOpenAICompletions` | openai-completions |
| `streamOpenAIResponses` / `streamSimpleOpenAIResponses` | openai-responses |

类型用 `as StreamFunction<具体 api, 具体 Options>` 找回 `lazyApi` 擦掉的泛型。

## 失败与边界

行为与直接调 lazy wrapper 相同：第一次调用才 import 实现；缺 key 同步 throw。没有额外逻辑。

## 下一课

本包自己的 CLI：[10-cli.ts.md](/series/pi-source/ai/071-cli-ts/)。产品 `pi` 命令不走这里。
