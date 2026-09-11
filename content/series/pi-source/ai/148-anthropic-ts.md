---
title: "anthropic.ts — 标准工厂加上「三种 key + 订阅 OAuth」"
summary: "对照 openai.ts 看同一套 createProvider 如何长出非标准鉴权。协议仍然一份 anthropicMessagesApi()，模型表仍然 Object.values(ANTHROPICMODELS)。变的是 auth"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/anthropic.ts`  
核心导出：`anthropicProvider`  
被谁调用：`all.ts` `builtinProviders()`。

## 本课目标

对照 [openai.ts](/series/pi-source/ai/194-openai-ts/) 看同一套 `createProvider` 如何长出非标准鉴权。协议仍然一份 `anthropicMessagesApi()`，模型表仍然 `Object.values(ANTHROPIC_MODELS)`。变的是 `auth`：API key 有三条环境变量且其中一条必须变成 `Authorization: Bearer`，另外还可以 `lazyOAuth` 登录 Claude Pro/Max。

读完应能指出：请求头里的 `x-api-key` 与 `Authorization` 是谁在 resolve 里决定的，而不是协议文件里写死的。

## 这个文件在系统中的位置

```text
anthropicProvider()
  createProvider({
    id: "anthropic",
    baseUrl: "https://api.anthropic.com",
    auth: { apiKey: anthropicApiKeyAuth(), oauth: lazyOAuth(...) },
    models: Object.values(ANTHROPIC_MODELS),
    api: anthropicMessagesApi(),          // lazy → api/anthropic-messages.ts
  })
```

第 1 层（本文件）管门牌和钥匙。第 2 层把 `Context.tools` 写成 Anthropic `tools` 数组、处理 thinking blocks。第 3 层 json 决定 `claude-opus-4-7` 的窗口、价格、`thinkingLevelMap`、`compat.forceAdaptiveThinking`。

MiniMax、Kimi Coding、Vercel AI Gateway、Fireworks 的一部分模型也声明 `api: "anthropic-messages"`，**复用同一份协议实现**，各自的工厂只换 baseUrl 和鉴权。这就是「厂家 ≠ 协议」。

## 导出什么

`anthropicProvider(): Provider<"anthropic-messages">`。内建 14 款 Claude 全是 Messages API。

文件里还有未导出的 `anthropicApiKeyAuth()`：因为 Anthropic 的环境变量语义比 `envApiKeyAuth` 多一岔，不能用 helpers 里的标准函数。

## 如何鉴权 / baseUrl

厂家 `baseUrl`：`https://api.anthropic.com`。json 里每条模型同样写这个值。没有区域占位符。

### API key：`anthropicApiKeyAuth`

`login` 与标准相同：secret 提示，存 `{ type: "api_key", key }`。

`resolve` 顺序是产品语义，不能改乱：

1. **已存 credential.key** → `{ auth: { apiKey: key } }`。协议层会把它放进 Anthropic 惯用的 `x-api-key`（具体头名在 api 实现 / 共享 header 工具里，不在本文件）。
2. **`ANTHROPIC_AUTH_TOKEN`** → **不是** `apiKey` 字段，而是 `{ auth: { headers: { Authorization: Bearer ... } } }`。注释写在 `env-api-keys.ts`：这条变量参与「有没有配置」的发现，但 `getEnvApiKey()` 故意跳过它，因为请求必须走 Bearer，不能当 `x-api-key`。
3. **`ANTHROPIC_OAUTH_TOKEN`**、**`ANTHROPIC_API_KEY`**：当作普通 `apiKey`。前者是有人把 OAuth access token 塞进环境变量的逃生口，走 key 头而不是本文件的 `oauth` 流程。

都没有则 `undefined`，未配置。

`Models.getAuth` 会先看 credential store 里这家的类型。若存的是 `oauth` 凭证，走下面的 OAuth，不会再扫这三条环境变量（store 优先）。环境变量是「没登录过、只 export 了 key」的路径。

### OAuth：`lazyOAuth`

```ts
oauth: lazyOAuth({
  name: "Anthropic (Claude Pro/Max)",
  isSubscription: true,
  load: loadAnthropicOAuth,
}),
```

`lazyOAuth` 把真正的 PKCE/浏览器流程藏到第一次 `login`/`refresh`/`toAuth`。`loadAnthropicOAuth` 在 `auth/oauth/load.ts`，用动态 import 避免把 Node-only OAuth 推进浏览器包。`isSubscription: true` 给 UI：这是订阅额度，不是按 token 买的 key。

`pi-ai` CLI（`src/cli.ts`）从 `builtinProviders()` 过滤 `auth.oauth !== undefined` 的厂家，Anthropic 在这份名单里。

## 和 all.ts 的关系

`anthropicProvider` 是 `builtinProviders()` 里靠前的一家。`getBuiltinModel("anthropic", "claude-haiku-4-5")` 读 `ANTHROPIC_MODELS`，不跑本函数。

`getBuiltinModelDataGeneratedAt` 与 Anthropic 表同一次 generate 的时间戳绑在一起——所有 json 共享一份 `.manifest.json`。

## 逐步精读

`ANTHROPIC_MODELS` 来自 [anthropic.models.ts](/series/pi-source/ai/147-anthropic-models-ts/)，json 只有一组 `"anthropic-messages"`。flatten 之后 id 就是 `claude-opus-4-7` 这种官方 id。部分模型带 `compat.allowedFallbackModels`（例如 fable → opus-4-8 / opus-5）：那是协议/产品层的降级名单，写在模型表，不是工厂逻辑。

`thinkingLevelMap` 也在 json：`off: null` 表示不允许关思考；`xhigh`/`max` 有映射才出现在 `getSupportedThinkingLevels` 里。工厂不读这些字段，`clampThinkingLevel` 在 `models.ts` 对着 **模型对象** 算。

## 失败与边界

- 只设了 `ANTHROPIC_AUTH_TOKEN`：`checkAuth` 为已配置，请求带头 `Authorization`，不带 `x-api-key`。若协议层两者都写会冲突——resolve 互斥地只返回一种。
- OAuth token 过期：`Models.getAuth` 在 credential store 的 `modify` 里 refresh，失败抛 `ModelsError("oauth")`，**不删**已存凭证，重新 login 可救。
- 把 Claude 订阅 token 当 `ANTHROPIC_API_KEY` 用：可能被 API 拒。订阅路径应走 `oauth` 或文档指定的 header。
- Bedrock 上的 Claude 是 `amazon-bedrock` + `bedrock-converse-stream`，模型 id 带 `anthropic.claude-...` 前缀。本厂打 `api.anthropic.com`。

## 下一课

测试不发 HTTP 的厂家：[faux.ts](/series/pi-source/ai/164-faux-ts/)。真·IAM 链：[amazon-bedrock.ts](/series/pi-source/ai/144-amazon-bedrock-ts/)。模型表：[anthropic.models.ts](/series/pi-source/ai/147-anthropic-models-ts/)。
