---
title: "all.ts — 内建厂家的登记册，不是协议实现"
summary: "读完应能把三层拆开，不再把「Anthropic 这家公司」和「anthropic-messages 这份 HTTP 协议」当成一件事："
tags: [pi, ai]
---
源码：`packages/ai/src/providers/all.ts`  
核心导出：`builtinProviders`、`builtinModels`、`getBuiltinModel`、`BuiltinProvider`、`radiusProvider`（再导出）  
被谁调用：`packages/ai/src/compat.ts` 用 `builtinModels()` 填一份全局集合；`packages/ai/src/cli.ts` 用 `builtinProviders()` 筛出带 OAuth 的厂家做登录 CLI。coding-agent 的 `ModelRuntime` 也是把这些工厂 `setProvider` 进去。

## 本课目标

读完应能把三层拆开，不再把「Anthropic 这家公司」和「anthropic-messages 这份 HTTP 协议」当成一件事：

1. **厂家工厂**（本目录 `*.ts`）：id、显示名、默认 `baseUrl`、鉴权、把哪份 `api` 焊上、静态模型列表从哪来。
2. **api 协议**（`packages/ai/src/api/*.ts`）：`model.api` 决定怎么把统一 `Context` 译成厂家 JSON、怎么把 SSE 译回统一事件。键是协议名，不是商号。
3. **模型表**（`data/*.json` → `*.models.ts` → `src/models.generated.ts` 的 `MODELS`）：每款模型的 id、价格、窗口、`api` 字段、可能还有 per-model `baseUrl`/`headers`/`compat`。

`all.ts` 同时碰到第 1 层和第 3 层，**从不 import `src/api/`**。打电话是工厂里 `createProvider({ api: ... })` 的事。

## 这个文件在系统中的位置

```text
streamFn(model, context, options)
  → Models.streamSimple                 （models.ts）
       1. applyAuth：按 model.provider 找厂家，解析 key/headers/env
       2. provider.streamSimple(model, ...)
            createProvider 按 model.api 选一份 ProviderStreams
              → api/anthropic-messages.ts 或 openai-responses.ts ...
```

装配发生在更早：

```text
builtinModels()
  createModels()
  for (p of builtinProviders()) models.setProvider(p)
```

`builtinProviders()` **每次调用都 new 一套 Provider**。它不是单例。测试里两次 `builtinModels()` 得到两份互不共享动态缓存的集合。Radius 的 `refreshModels` 状态活在那一次工厂返回的闭包里。

## 三层不要混：一张对照

| 问题 | 看哪里 | 不在哪里 |
|---|---|---|
| 登录提示什么、读哪个环境变量 | 厂家工厂 `auth` | json、api 文件 |
| HTTP 路径、工具 JSON、SSE 事件 | `src/api/`，键是 `model.api` | 厂家 id |
| 这款模型贵不贵、能不能想、窗口多大 | json / `*.models.ts` | 工厂函数体（工厂只 `Object.values(...)`） |
| OpenAI 走 completions 还是 responses | **该模型对象的 `api` 字段** | 厂家名叫 openai |
| Cloudflare 账户 id 怎么进 URL | 工厂鉴权写出 `env`，stream 包装替换占位符 | 协议文件自己猜 |

同一厂家可以挂多份协议：`github-copilot` 的 `api` 是一张 map，`createProvider` 按 `model.api` 分发。同一协议也可以被许多厂家共用：`openai-completions` 被 DeepSeek、Groq、Moonshot、Xiaomi 一起用。

## 导出什么

### `BuiltinProvider` 与 `KnownProvider`

```ts
export type BuiltinProvider = keyof typeof MODELS;
```

`MODELS` 来自 `../models.generated.ts`，键是**有静态模型表的厂家**。注释写明：`KnownProvider`（`types.ts`）另外包含纯动态的 `"radius"`，Radius **没有** json、没有 `*.models.ts`，所以不在 `BuiltinProvider` 里。

`getBuiltinModel("radius", ...)` 编不过。运行时仍能 `radiusProvider()` 再 `setProvider`。

### `getBuiltinModel` / `getBuiltinModels` / `getBuiltinProviders`

这三条是**静态目录只读**，不构造 Provider，不碰鉴权：

- `getBuiltinModel("anthropic", "claude-opus-4-7")` 从 `MODELS.anthropic` 取出已经写好 `api`/`baseUrl`/`cost` 的 `Model`
- `getBuiltinProviders()` 是 `Object.keys(MODELS)`，**不含 radius**
- 返回类型用 `MODELS[provider][modelId].api` 推断，所以静态读出来的模型带着精确的 `Model<"anthropic-messages">`

compat 层把这三条 deprecated 成旧名 `getModel` / `getModels` / `getProviders`。新代码：要类型安全的目录读，用这里；要真发请求，用 `Models` 集合。

### `getBuiltinModelDataGeneratedAt`

读 `./data/.manifest.json` 的 `generatedAt`。json 目录 gitignore，本机 `npm run generate-models` 或 `hydrate-model-data` 才有这份清单。`Date.parse` 失败返回 `undefined`。用来判断「我这台机器上的模型表是哪天灌的」，不是运行时版本号。

### `builtinProviders(): Provider[]`

按字母顺序（源码里按 import 顺序，实际是厂家 id 大致字母序）调用每一个 `xxxProvider()`。**含 `radiusProvider()`**。这是运行时登记，和 `MODELS` 的键集合不是同一个。

再导出 `radiusProvider`，方便调用方只拿 Radius、不拉全表。

### `builtinModels(options?)`

`createModels(options)` 之后把上面那一排 `setProvider`。`options` 可注入 `credentials`、`modelsStore`、`authContext`。coding-agent 会把磁盘上的 `auth.json` 做成 `CredentialStore` 传进来；不传则内存空店，只能靠环境变量。

### `builtinImagesProviders` / `builtinImagesModels`

图像是另一条平行世界：`ImagesProvider` / `createImagesModels`。内建只有 `openrouterImagesProvider()`。聊天的 `openrouterProvider()` 和图像的 `openrouterImagesProvider()` **id 都是 `"openrouter"`**，但分别注册进 `Models` 与 `ImagesModels`，不会撞。鉴权对象形状相同（同一把 `OPENROUTER_API_KEY` / 同一套 OAuth），所以用户登一次 OpenRouter，聊天和出图都能用。

## 如何鉴权 / baseUrl

本文件**不做鉴权**。它只把工厂返回的 `Provider` 放进集合。每家的 `auth`、`baseUrl` 写在各自的 `xxx.ts`。

`createProvider` 的 `baseUrl` 是厂家缺省；真正请求用的是 **模型对象上的 `model.baseUrl`**（json 里写死），除非 `applyAuth` 用鉴权结果覆盖。Azure 模型的 `baseUrl` 是空字符串：端点随租户变，必须登录或配置时再填。Cloudflare 模型 URL 里是 `{CLOUDFLARE_ACCOUNT_ID}` 占位符，要等 `cloudflare-stream.ts` 用解析出的 env 替换。

## 和 all.ts 的关系

本课就是 `all.ts`。记住两张表：

| 集合 | 来源 | 有没有 radius | 有没有图像 |
|---|---|---|---|
| `MODELS` / `getBuiltin*` | `*.models.ts` ← json | 无 | 无 |
| `builtinProviders()` | 各 `*Provider()` | 有 | 无（图像走 `builtinImagesProviders`） |

`compat.ts` 模块加载时执行 `const compatModels = builtinModels()`，旧 `stream()` API 打到这份单例上。产品路径应自己 `createModels` + `setProvider`，不要依赖 compat 全局。

## `createProvider` 模式（读完 openai / anthropic 再回来对）

最薄的厂家（[openai.ts](/series/pi-source/ai/194-openai-ts/)）：

```ts
return createProvider({
  id: "openai",
  name: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  auth: { apiKey: envApiKeyAuth("OpenAI API key", ["OPENAI_API_KEY"]) },
  models: Object.values(OPENAI_MODELS),
  api: openAIResponsesApi(),
});
```

五件套：身份、门牌 URL、鉴权、模型表、协议。`api` 可以是一份 `ProviderStreams`，也可以是 `Record<model.api, ProviderStreams>`。`openAIResponsesApi()` 本身是 lazy：第一次 stream 才 `import("./openai-responses.ts")`，浏览器包不必一上来拖 OpenAI SDK。

Anthropic 只是把 `apiKey` 写成自定义 resolve，再加 `oauth: lazyOAuth(...)`。协议仍是一份 `anthropicMessagesApi()`。

`createProvider` 在 `models.ts`：静态 `models` 作底，可选 `fetchModels` 刷新后按 id 覆盖/追加；`stream` 按 `model.api` 找不到实现就 `lazyStream` 抛 `ModelsError("stream", ...)`。Radius **不走** `createProvider`，自己实现 `Provider` 接口（见 [radius.ts](/series/pi-source/ai/210-radius-ts/)），但同样被本文件推进 `builtinProviders()`。

## 失败与边界

- 静态目录里没有的厂家，`getBuiltinModel` 得到 `undefined`（实现是 `models?.[modelId]`）。TypeScript 在合法键上认为总有值，运行时仍要防生成表和工厂不同步。
- `getBuiltinModels` 对未知 provider 返回 `[]`，不 throw。
- `builtinProviders` 每次新建。不要假设「登录状态存在 Provider 对象上」——凭证在 `CredentialStore`，Provider 只提供 `auth.resolve`。
- 图像工厂不在 `builtinProviders` 里。只 import `all.ts` 不会触发 `images/register-builtins.ts` 的副作用；compat / `images.ts` 才会。

## 下一课

先看最薄的完整工厂 [openai.ts](/series/pi-source/ai/194-openai-ts/)，再看鉴权变体 [anthropic.ts](/series/pi-source/ai/148-anthropic-ts/)。测试替身是 [faux.ts](/series/pi-source/ai/164-faux-ts/)，它不进 `builtinProviders`。模型表怎么从 json 变成类型，见任意一篇 `*.models.ts` 和 [00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
