---
title: "22 · api/simple-options.ts — `streamSimple` 的公共翻译层"
summary: "记住两件事：maxTokens 会被 context window 夹住留 4096 安全垫；思考 token 和回答共享上限时，必须给回答留 MINANSWERTOKENS = 1024。"
tags: [pi, ai]
---
源码：`packages/ai/src/api/simple-options.ts`  
被谁调用：每个协议文件的 `streamSimple`：先 `buildBaseOptions`，再填自己的 thinking 字段。

## 本课目标

记住两件事：`maxTokens` 会被 context window 夹住留 4096 安全垫；思考 token 和回答共享上限时，必须给回答留 `MIN_ANSWER_TOKENS = 1024`。

## 在系统中的位置

```text
streamSimple(model, context, { reasoning, maxTokens, thinkingBudgets, ... })
  buildBaseOptions → StreamOptions（温度、头、sessionId、夹过的 maxTokens）
  各协议再加 effort / thinkingEnabled / thinking.budgetTokens
    stream(model, context, 厂家 Options)
```

## `clampMaxTokensToContext`

```ts
available = model.contextWindow - estimateContextTokens(context).tokens - 4096
return min(maxTokens, max(1, available))
```

`contextWindow <= 0`（未知）则只保证 `maxTokens >= 1`。估计值来自 [63 课](/series/pi-source/ai/124-utils-estimate-ts/)：有上次 usage 就用真值 + 尾巴，否则 4 字符 ≈ 1 token。

这是为了「输入已经 190k、模型窗 200k、请求 maxTokens=16k」时厂家直接 400。Agent 仍可能低估，overflow 检测在更外层。

## `buildBaseOptions`

把 `SimpleStreamOptions` 里协议无关的字段拷到 `StreamOptions`。`samplingParams` = `{ ...model.samplingParams, ...options.samplingParams }`，请求级覆盖模型默认。`apiKey: apiKey || options?.apiKey`：调用方可以先自己解析再传入。

**不含** `reasoning` / `toolChoice` / `thinkingBudgets`——那些每个协议名字不同。

## 思考预算

`DEFAULT_THINKING_BUDGETS`：minimal 1024、low 2048、medium 8192、high 16384。`xhigh`/`max` 经 `clampReasoning` 变成 `high`（token 预算厂家没有更高档）。

`adjustMaxTokensForThinking(baseMaxTokens, modelMaxTokens, level, custom?)`：

- 调用方没设 cap（`undefined`）：用 `model.maxTokens`，思考预算在里面。
- 调用方设了 cap：`min(baseMaxTokens + thinkingBudget, modelMaxTokens)`——给思考加头寸。
- 若加完仍 `maxTokens <= thinkingBudget`：把思考预算砍到 `maxTokens - 1024`。

Anthropic 旧模型和 Bedrock Claude 的 `streamSimple` 用这个。Adaptive thinking（effort 档）不走预算。

注释写得很狠：不要把 `undefined` maxTokens 收成 0，否则思考预算会变成整个 max_tokens，回答没地方写。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 估计 token 偏小 | 仍可能 400 overflow |
| 估计偏大 | maxTokens 被夹得过小，过早 length |
| reasoning 是 xhigh | 预算按 high |
| contextWindow 错误数据 | 夹错。生成目录的责任 |

## 下一课

跨厂家回放消息：[23-api-transform-messages.ts.md](/series/pi-source/ai/084-api-transform-messages-ts/)。
