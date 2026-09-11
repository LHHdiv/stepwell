---
title: "03 · compat.ts — 旧全局电话交换机"
summary: "把「Agent 说 streamSimple」到「某个 api/.ts 的 streamSimple 被调用」画成一张图。能指出：registry 键是 model.api、env API key 何时注入、Cloudflare 为什么"
tags: [pi, ai]
---
源码：`packages/ai/src/compat.ts`（约 298 行）  
被谁调用：

- coding-agent `sdk.ts`：`import { streamSimple } from "@earendil-works/pi-ai/compat"`，`setDefaultStreamFn(streamSimple)`。产品路径的 `streamFn` **不直接打这里**，而是 `modelRuntime.streamSimple`；compat 的 `streamSimple` 是给「没传 streamFn 的旧 Agent / 扩展」当默认电话。
- 测试几乎全部 `from "../src/compat.ts"`。
- 扩展 `llama/provider.ts`：自定义厂家没有自己的 stream 实现时，转调 compat。

## 本课目标

把「Agent 说 streamSimple」到「某个 `api/*.ts` 的 streamSimple 被调用」画成一张图。能指出：registry 键是 `model.api`、env API key 何时注入、Cloudflare 为什么走另一条路、builtin 覆盖为什么不能砸扩展已经注册的项。这是本包最值得单步的文件。

文件头注释写了它的寿命：Existing apps switch imports to `/compat` unchanged; new code uses `createModels()` and provider factories. **This module is deleted with the coding-agent ModelManager migration.**

## 在系统中的位置

两条并行的打电话路径：

```text
【产品路径 · 新】
sdk streamFn
  → ModelRuntime.streamSimple          （实现 Models）
      lazyStream → applyAuth
      → provider.streamSimple          （createProvider 按 model.api）
          → anthropic-messages.streamSimple 等

【兼容路径 · 本文件】
setDefaultStreamFn(streamSimple)  或  测试直接 import
  → compat.streamSimple(model, context, options)
      withEnvApiKey                    （没显式 apiKey 就读环境变量）
      若是 builtin 厂家 + 当前 registry 项仍是 builtin
        → 那家 Provider.streamSimple   （builtinModels() 里的工厂）
      否则
        → apiProviderRegistry.get(model.api).streamSimple
            wrapStreamSimple 校验 model.api
            → lazyApi → 真正的 api/*.ts
```

产品路径**不**走 `withEnvApiKey`：鉴权由 `Models.getAuth` + credential store 做。compat 路径要自己从环境变量补 key，因为旧调用方经常只传 model、不传 apiKey。

## 模块加载时发生了什么（副作用）

`package.json` 把 `./dist/compat.js` 标成 sideEffect。import 本文件会：

1. re-export 所有 lazy API、`env-api-keys`、图像、`index.ts`、legacy 别名。
2. `import "./providers/images/register-builtins.ts"`（经 images 那条链）把 openrouter-images 注册进图像 registry。
3. 调 `registerBuiltInApiProviders()`。

所以「import compat」=「把 10 个对话协议 + 图像 API 装进两个全局 Map」。这就是主入口故意不 export streamSimple 的原因：不想这个副作用出现在树摇后的浏览器包里。

## 全局 API registry

```ts
const apiProviderRegistry = new Map<string, RegisteredApiProvider>();
```

键是 `provider.api`（协议 id），值是 `{ provider: { api, stream, streamSimple }, sourceId? }`。

### `wrapStream` / `wrapStreamSimple`

注册时把带精确 `TApi` 的函数擦成 `ApiStreamFunction`：

```ts
function wrapStreamSimple(api, streamSimple) {
  return (model, context, options) => {
    if (model.api !== api) {
      throw new Error(`Mismatched api: ${model.api} expected ${api}`);
    }
    return streamSimple(model as Model<TApi>, context, options);
  };
}
```

调用方拿着 `Model<Api>` 也能进具体实现。跑错协议会在进厂家代码**之前**炸，而不是发一个形状不对的 HTTP。

### `registerApiProvider` / `getApiProvider` / `unregisterApiProviders`

扩展或测试可以注册自定义 api id，`sourceId` 用来成批卸：`unregisterApiProviders("my-extension")`。`registerFauxProvider` 用随机 `faux-provider-xxxx` 当 sourceId，测试结束 `unregister()`。

### `registerBuiltInApiProviders`

```ts
const BUILTIN_APIS: [Api, ProviderStreams][] = [
  ["anthropic-messages", anthropicMessagesApi()],
  ["openai-completions", openAICompletionsApi()],
  ["openai-responses", openAIResponsesApi()],
  ["openai-codex-responses", openAICodexResponsesApi()],
  ["azure-openai-responses", azureOpenAIResponsesApi()],
  ["google-generative-ai", googleGenerativeAIApi()],
  ["google-vertex", googleVertexApi()],
  ["mistral-conversations", mistralConversationsApi()],
  ["bedrock-converse-stream", bedrockConverseStreamApi()],
  ["pi-messages", piMessagesApi()],
];
```

每个 `*Api()` 返回 `lazyApi(() => import("./xxx.ts"))`，**此刻不加载厂家 SDK**。第一次真正 stream 才 dynamic import。

关键策略：**不覆盖已有项**。

```ts
if (!getApiProvider(api)) {
  registerApiProvider({ api, stream, streamSimple });
}
builtinApiProviderInstances.set(api, getApiProvider(api));
```

compat 可能在测试已经 `registerApiProvider` 覆盖 anthropic-messages 之后才被 import。后加载的 builtin 不能把测试桩砸掉。`builtinApiProviderInstances` 记下「builtin 当时装进去的那份引用」，后面 `getBuiltinProviderForModel` 用引用相等判断「当前 registry 是不是还是 builtin」。

`resetApiProviders()` 清空再重装，测试隔离用。

## `stream` / `streamSimple` 分发（核心）

先看 `streamSimple`，`stream` 同构，只是选项类型更宽。

```ts
export function streamSimple(model, context, options?) {
  const builtinProvider = getBuiltinProviderForModel(model);
  if (builtinProvider) {
    if (model.provider.startsWith("cloudflare-") && !hasResolvedCloudflareAuth(options)) {
      return compatModels.streamSimple(model, context, options);
    }
    return builtinProvider.streamSimple(model, context, withEnvApiKey(model, options));
  }
  const provider = resolveApiProvider(model.api);
  return provider.streamSimple(model, context, withEnvApiKey(model, options));
}
```

三步：

### 1. `getBuiltinProviderForModel`

```ts
function getBuiltinProviderForModel(model) {
  if (getApiProvider(model.api) !== builtinApiProviderInstances.get(model.api))
    return undefined;  // 有人覆盖了这个 api，走 registry
  const provider = compatModels.getProvider(model.provider);
  return provider?.getModels().some((c) => c.api === model.api) ? provider : undefined;
}
```

`compatModels = builtinModels()`，即 `providers/all.ts` 里那份静态厂家集合。

只有同时满足才走「厂家工厂」：

- registry 里这个 api 仍是 builtin 那份（没被测试/扩展覆盖）
- `model.provider` 能在 builtin 集合里找到
- 那家的模型目录里确实有这个 `api`

否则退到纯 api registry：自定义 `models.json` 厂家、faux、只注册了 api 没注册厂家的情况。

为什么要先走厂家工厂而不是直接 `registry.get(model.api)`？厂家工厂的 `streamSimple` 可能包了 Cloudflare 账号占位符替换、Bedrock region、Copilot 动态头——不只是协议实现。builtin 厂家的 `createProvider({ api: ... })` 最终仍会调到同一个 `api/*.ts`，但中间隔着厂家自己的 stream 包装。

### 2. Cloudflare 特例

```ts
if (model.provider.startsWith("cloudflare-") && !hasResolvedCloudflareAuth(options)) {
  return compatModels.streamSimple(model, context, options);
}
```

`hasResolvedCloudflareAuth`：显式 `apiKey` 或已经有 `cf-aig-authorization` 头。

Cloudflare 的鉴权不是一把 API key 那么简单：要 account id、gateway id，还可能走 Workers binding。这些在厂家工厂的 `auth.apiKey.resolve()` 里。如果调用方没带 key，compat 不能用 `withEnvApiKey` 塞一个 `CLOUDFLARE_API_KEY` 就完事——必须走 `Models.streamSimple`，让 `applyAuth` 填 `baseUrl` 占位符和头。

已经带了 key 或 binding sentinel 的，当普通 builtin 厂家发。

### 3. `withEnvApiKey`

```ts
function withEnvApiKey(model, options) {
  if (hasExplicitApiKey(options?.apiKey)) return options;
  const apiKey = getEnvApiKey(model.provider, options?.env);
  if (!apiKey || apiKey === "<authenticated>") return options;
  return { ...options, apiKey };
}
```

- 调用方传了非空 `apiKey`：不动。OAuth access token 也走这个字段。
- 否则 `getEnvApiKey`（[08 课](/series/pi-source/ai/069-env-api-keys-ts/)）按厂家读 `ANTHROPIC_API_KEY` 等。
- `"<authenticated>"` 是 Vertex ADC / Bedrock IAM 的哨兵：**不是**真 key，不能塞进 `Authorization`。留给厂家工厂自己处理。compat 看到哨兵就当没补上。

Anthropic 的 `ANTHROPIC_AUTH_TOKEN` 在 `getEnvApiKey` 里被跳过（必须当 Bearer，不能当 `x-api-key`）。compat 这条路径补不到它——要用 header 或走 Models 的 auth。

### `resolveApiProvider`

registry 没有这个 api 就 throw `No API provider registered for api: ${api}`。自定义协议必须先 `registerApiProvider`。

## `complete` / `completeSimple`

```ts
export async function completeSimple(...) {
  const s = streamSimple(...);
  return s.result();
}
```

`result()` 等到 `done` 或 `error` 事件，返回那条 `AssistantMessage`。不流式的调用方用这个。失败仍是消息上的 `stopReason: "error"`，Promise 本身 resolve（除非 stream 实现违反合约 throw）。

注意：`streamSimple` 在缺 key 时**同步 throw**，`completeSimple` 也会 throw。这是 `StreamFunction` 合约允许的唯一同步失败。

## 废弃的目录读取

```ts
export const getModel = getBuiltinModel;
export const getModels = getBuiltinModels;
export const getProviders = getBuiltinProviders;
```

静态生成目录。新产品用 `Models.getModel()`，能看到动态刷新和扩展厂家。这三个别名是为了旧 `import { getModel } from "pi-ai"` 不改。

## `registerFauxProvider`

把 `createFauxCore` 的 stream 注册进 **api registry**（不是 Models 集合）。返回的对象带 `unregister`。测试用它假装一个 api，不必起 HTTP。

这和 `createModels().setProvider(faux)` 是两条线：compat 测试打 `streamSimple`，走 registry；新产品测试打 `models.streamSimple`，走 Provider 集合。

## 和 ModelRuntime.streamSimple 对照（必读）

coding-agent 产品路径：

```ts
// sdk.ts
return modelRuntime.streamSimple(model, context, {
  ...options,
  timeoutMs, maxRetries, maxRetryDelayMs,
  transformHeaders: async (headers) => { /* 归因头 + 扩展 */ },
});
```

`ModelRuntime.streamSimple`（实现同本包 `ModelsImpl`）：

```ts
return lazyStream(model, async () => {
  const prepared = await this.prepareRequest(model, options); // getAuth
  return prepared.provider.streamSimple(prepared.model, context, prepared.options);
});
```

差别：

| | compat.streamSimple | Models.streamSimple |
|---|---|---|
| 鉴权 | `withEnvApiKey` 读环境变量 | `resolveProviderAuth`：credential store → OAuth refresh → env |
| 分发 | builtin 厂家优先，否则 api registry | **只**按 `model.provider` 找 Provider，再按 `model.api` 找 streams |
| 覆盖 api | `registerApiProvider` 全局 | 换整个 Provider |
| 缺厂家 | 只要 registry 有这个 api 就能打 | throw `Unknown provider` |
| 缺 key | 同步 throw（进到 api 实现后） | setup 阶段 throw，被 lazyStream 收成 `error` 事件 |
| Cloudflare | 无 resolved auth 时改走 Models | 本来就是这条 |

扩展 `pi.registerProvider({ api, streamSimple })` 走 coding-agent 的 `provider-composer`：优先扩展自己的 streamSimple，否则 builtin 厂家，再否则 `getApiProvider(model.api)`——最后一跳仍是本文件的 registry。

## 失败与边界

| 情况 | 行为 |
|---|---|
| `model.api` 未注册 | throw `No API provider registered` |
| wrap 校验失败 | throw `Mismatched api` |
| 没 apiKey、环境也没有 | 进入具体 `streamSimple` 后同步 throw `No API key for provider: ...` |
| Vertex/Bedrock 只有 ADC/IAM | `getEnvApiKey` 返回 `<authenticated>`，compat **不**注入；若没走厂家工厂，厂家实现会再报缺 key。builtin 厂家路径 OK |
| Cloudflare 无 key 无 binding 头 | 改走 `compatModels.streamSimple`，由 Models.applyAuth 处理 |
| 扩展覆盖了 anthropic-messages | `getBuiltinProviderForModel` 返回 undefined，所有 anthropic-messages 模型都走覆盖实现，包括官方 Claude |
| import 顺序 | builtin 不砸已有注册；但 `resetApiProviders` 会清掉扩展的注册再装 builtin |

缺 key 的同步 throw 发生在 `streamSimple` **函数体里**（各 api 文件顶部 `getClientApiKey`），发生在返回 stream 之前。`lazyApi` 包的是 `stream`/`streamSimple` 的调用，compat 直接调 wrap 过的函数，所以这条 throw 会穿到 Agent。`Models.streamSimple` 把同样的调用放进 `lazyStream(setup)`，setup throw 会变成 `error` 事件。产品路径更不容易炸 lifecycle。

## 下一课

新产品分发在 [04-models.ts.md](/series/pi-source/ai/065-models-ts/)：`createProvider` 如何按 `model.api` 选 streams，`Models.streamSimple` 如何 `applyAuth`。读完这两课，api 文件只是「某一种 HTTP 方言」。
