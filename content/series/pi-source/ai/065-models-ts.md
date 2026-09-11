---
title: "04 · models.ts — 运行时厂家集合与按 api 分发"
summary: "能画出 createModels 里一次 streamSimple：resolve auth → 改 baseUrl/headers → provider.streamSimple → createProvider 按 model.ap"
tags: [pi, ai]
---
源码：`packages/ai/src/models.ts`（约 957 行）  
被谁调用：coding-agent `ModelRuntime` 实现同一套 `Models` 接口（逻辑几乎是拷贝 + 产品层的 models.json）；测试 `createModels()`；compat 的 `builtinModels()` 内部也是一组 `Provider`。

## 本课目标

能画出 `createModels` 里一次 `streamSimple`：resolve auth → 改 baseUrl/headers → `provider.streamSimple` → `createProvider` 按 `model.api` 取 `ProviderStreams`。这是新产品的电话交换机，对照上一课的全局 registry。

## 在系统中的位置

```text
createModels({ credentials, modelsStore, authContext })
  setProvider(anthropicProvider())
  setProvider(openaiProvider())
  ...
  streamSimple(model, context, options)
    lazyStream
      requireProvider(model.provider)
      applyAuth → getAuth → resolveProviderAuth
      provider.streamSimple(requestModel, context, requestOptions)
        createProvider.dispatch(model.api)
          streams.streamSimple → api/*.ts
```

`Provider` 是「一家店」：id、鉴权、模型目录、stream 行为。`Models` 是店的集合 + 把鉴权焊到每次请求上。

## `Provider` 接口

必有：`id`、`name`、`auth`（至少 apiKey 或 oauth 之一）、`getModels()`、`stream`、`streamSimple`。

可选：`baseUrl`、`headers`、`refreshModels`、`filterModels`、`fetchDeferred`、`cancelDeferred`。

约束：

- `getModels()` **禁止 throw**。`Models` 把 throw 当成「这家没有模型」。
- `auth` 即使是本地无 key 的 llama.cpp 也要有 `apiKey`，其 `resolve()` 报告「已配置」（空 key 也算配置）。`getAuth()` 在未配置时返回 `undefined`。
- `filterModels` 不改 `getModels()` 的完整目录，只在 `getAvailable()` 里滤（例如 Copilot 按订阅可见模型）。

`TApi` 让工厂函数能写出 `Provider<"openai-responses" | "openai-completions">`。放进 `Models` 之后收成 `Provider<Api>`。

## `createProvider`：从零件装配一家店

`CreateProviderOptions`：id、auth、静态 `models`、可选 `fetchModels`、`filterModels`、以及 **`api: ProviderStreams | Partial<Record<TApi, ProviderStreams>>`**。

最后这项是分发：

```ts
const single = typeof input.api.stream === "function" ? input.api : undefined;
const byApi = single ? undefined : input.api;
const apiFor = (model) => single ?? byApi?.[model.api];

const dispatch = (model, run) => {
  const streams = apiFor(model);
  if (!streams) {
    return lazyStream(model, async () => {
      throw new ModelsError("stream", `Provider ${id} has no API implementation for "${model.api}"`);
    });
  }
  return run(streams);
};

stream: (model, context, options) =>
  dispatch(model, (s) => s.stream(model, context, options)),
streamSimple: (model, context, options) =>
  dispatch(model, (s) => s.streamSimple(model, context, options)),
```

OpenAI 官方工厂传 map：`{ "openai-completions": openAICompletionsApi(), "openai-responses": openAIResponsesApi() }`。Anthropic 传单个 `anthropicMessagesApi()`。

模型的 `api` 在 map 里没有对应项：不 throw 到调用方，而是返回一个立刻 `error` 事件的 stream（`lazyStream` + throw）。符合「一旦返回 stream，失败走事件」的合约。

### 动态目录

有 `fetchModels` 才实现 `refreshModels`：

1. 若 `context.stored` 存在，先 `publish({ update })` 把缓存模型装回内存（离线也能列出上次的模型）。
2. `allowNetwork === false` 到此为止（`Models.refresh` 的第一阶段）。
3. 联网拉新列表，`publish({ persist, update })`：先写 store，再改内存。`publish` 返回 false 表示这次 refresh 已经被更新的一代取代，丢弃结果。

合并规则：`currentModels()` = 静态 baseline + 动态 overlay，同 id 动态覆盖静态。

## `ModelsImpl`

### 构造

默认 `InMemoryCredentialStore` + `InMemoryModelsStore` + `defaultProviderAuthContext()`。App 注入文件版 store（coding-agent 的 auth.json / 模型缓存）。

### 集合操作

`setProvider` / `deleteProvider` / `clearProviders` 都会 `supersedeProviderRefresh`：generation +1，abort 正在进行的 refresh。换厂家不能让旧的网络回调把过期目录写回来。

### `getModels` / `getModel`

同步，读各家 `getModels()`。`getModel(provider, id)` 只在这一家找。动态目录在下次 `refresh` 前保持上次结果。

### `refresh`（两阶段，并发，不 reject）

```text
对每个有 refreshModels 的厂家（可按 id 过滤）:
  beginProviderRefresh → 新 generation + AbortController
  先 readCredential（失败记下来，仍继续）
  phase1: allowNetwork=false  → 只恢复 store
  若 credential 读取失败: throw，记入 errors
  若不允许联网或已 abort: return
  resolveRefreshCredential（OAuth 过期则在 store.modify 里 refresh）
  无 credential: return（不联网）
  phase2: allowNetwork=true, 带 force
```

返回 `{ aborted, errors: Map<providerId, Error> }`。单个厂家失败不影响其他。调用方 signal abort 则 `aborted: true`。

OAuth refresh 在 `resolveRefreshCredential` 里走 `credentials.modify`，和请求路径的 `resolveProviderAuth` 同一把锁，不会双刷 token。

`publishProviderModels` 用 per-provider promise 链串行化写 store。generation 不匹配或 signal abort 则返回 false，厂家应停止。

### 鉴权

`checkAuth`：OAuth 有存储凭证就算配置好（不 refresh）；apiKey 走 `check()` 或完整 `resolve()`。

`getAvailable`：checkAuth 通过的厂家，取其 `getModels()`，再 `filterModels`。

`getAuth(providerId | model)`：

1. 未知厂家 → `undefined`
2. `resolveProviderAuth`（[46 课](/series/pi-source/ai/107-auth-resolve-ts/)）
3. 若传入的是 model 且 model 自带 `headers`，merge 进结果（模型头覆盖 auth 头，大小写不敏感去重）

未配置返回 `undefined`，不 throw。真正的失败（refresh 挂了、store 挂了）throw `ModelsError` code `"oauth"` / `"auth"`。

### `login` / `logout`

`login` 调厂家的 `oauth.login` 或 `apiKey.login`，然后 `credentials.modify(() => credential)`。有一段精细的 abort：login 网络已经成功、mutate 还没开始时，abort 会拒绝写入；mutate 一旦开始就不再因 abort 丢凭证（避免「服务器已发 token、本地没存」）。

`logout` 就是 `credentials.delete`。

## `streamSimple`（产品路径的心脏）

```ts
streamSimple(model, context, options?) {
  return lazyStream(model, async () => {
    const provider = this.requireProvider(model);          // 未知厂家 → ModelsError
    const { requestModel, requestOptions } = await this.applyAuth(model, options);
    return provider.streamSimple(requestModel, context, requestOptions);
  });
}
```

同步返回 stream。auth 是异步的，所以包在 `lazyStream` 里：setup 失败变成 `error` 事件，**不会**同步 throw 到 Agent。这是和 compat 缺 key 同步 throw 的关键差别。

### `applyAuth`

```ts
const resolution = await this.getAuth(model, {
  apiKey: options?.apiKey, env: options?.env, signal: options?.signal,
});
if (!resolution) throw new ModelsError("auth", `Provider is not configured: ${model.provider}`);

const apiKey = options?.apiKey ?? auth.apiKey;           // 请求级显式 key 赢
let headers = mergeHeaders(auth.headers, options?.headers);
if (options?.transformHeaders) headers = await options.transformHeaders(headers ?? {});
const env = { ...resolution.env, ...options?.env };
const requestModel = auth.baseUrl ? { ...model, baseUrl: auth.baseUrl } : model;
```

`transformHeaders` 是 `ModelsRequestTransforms` 独有的，coding-agent 用来叠归因头和扩展 `before_provider_headers`。它在 merge 之后跑，所以扩展能看到完整头，也能删。

`mergeHeaders` 按小写名字去重：后写覆盖先写，但保留后写的原始大小写。

Copilot 的 `toAuth` 会返回 per-credential `baseUrl`（从 token 的 `proxy-ep` 解析）。`requestModel` 是浅拷贝，不改调用方手里的 model。

`stream` / `streamDeferred` / `cancelDeferred` 同一套 `applyAuth`。

`complete` / `completeSimple` / `fetchDeferred` 都是对应 stream 的 `.result()`。

## `hasApi` / 费用 / 思考档

```ts
export function hasApi(model, api): model is Model<TApi> {
  return model.api === api;
}
```

动态查到的 `Model<Api>` 用这个收窄，才能传精确 Options。

`calculateCost`：按 `usage.input + cacheRead + cacheWrite` 选最高匹配的 `cost.tiers`；1h cache write（`cacheWrite1h`）按 `2 * input` 价。**原地写** `usage.cost` 并返回。

`getSupportedThinkingLevels`：`reasoning === false` → `["off"]`。map 里 `null` 去掉该档；`xhigh`/`max` 必须 map 里显式有值才出现。

`clampThinkingLevel`：请求档不支持则向上找，再向下找，再退回列表第一项。sdk 选思考档时用它。

`modelsAreEqual`：比 `id` **和** `provider`。OpenRouter 和 Anthropic 都可能有同名模型 id。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 未知 `model.provider` | stream 路径：lazyStream 发 `error`；login：throw `ModelsError("provider")` |
| 厂家未配置 auth | `getAuth` → undefined；stream → `Provider is not configured` 变成 error 事件 |
| OAuth refresh 失败 | `ModelsError("oauth")`，**原凭证保留**，重新 login 才换 |
| 模型 api 厂家没实现 | `error` 事件，文案带 api id |
| `getModels()` throw | 当空列表 |
| refresh 中途换厂家 | 旧 generation 的 persist 被丢弃 |
| 显式 `options.apiKey` | 覆盖存储凭证；仍会 merge headers/env |
| `transformHeaders` 异步 | applyAuth await 它，stream 仍同步返回（在 lazyStream 里） |

## 下一课

模型缓存的磁盘形状：[05-models-store.ts.md](/series/pi-source/ai/066-models-store-ts/)。然后生成目录如何变成 `MODELS` 常量。
