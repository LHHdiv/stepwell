---
title: 第07讲·Provider 抽象：统一多供应商接入
summary: 拆解 Provider 接口、ModelsImpl 编排与 createProvider 工厂，看清 pi 接入多供应商的可插拔接缝。
objectives:
  - 说明 Provider<TApi> 接口如何把"鉴权、模型清单、流式"收口为统一契约
  - 解释 ModelsImpl 如何用 Map 管理多个 Provider 并委托请求
  - 描述 createProvider 工厂与 anthropicProvider/builtinProviders 如何装配内置清单
keyPoints:
  - Provider<TApi> 接口定义 id/auth/getModels/stream 等，是接入供应商的接缝，models.ts:97
  - ModelsImpl 以 Map 持有 Provider 并提供统一 stream/getModel，models.ts:254
  - createProvider 工厂合并静态+动态模型并处理按 api 派发，models.ts:762
  - anthropicProvider 经 createProvider 构造具体供应商，providers/anthropic.ts:43
  - builtinProviders 返回所有内置 Provider 实例数组，providers/all.ts:89
  - 扩展可通过 setProvider 注入自定义 Provider，实现可插拔
tags: [pi, pi-ai, Provider, 抽象]
---

你家的路由器后面可能插着电信、联通两根线，但你的电脑只管"发数据包"，从不在乎底下是哪根线。pi 接入几十家大模型供应商（Anthropic、OpenAI、Google、Bedrock……）时，用的也是同一招：**上层只看一个统一接口 `Provider`，具体是哪家、怎么鉴权、怎么发请求，全被这个接口吞掉。**

本讲我们看这条"接缝"是怎么定义的，以及 `pi-ai` 如何用 `ModelsImpl` 把几十个 `Provider` 编排成一个门面。

## 一、结论：Provider 是 pi 接入供应商的唯一接缝

`Provider<TApi>` 接口定义在 `models.ts:97`，它是所有供应商的"身份证 + 能力清单"：

```ts
export interface Provider<TApi extends Api = Api> {
  readonly id: string;                                  // 供应商标识，如 "anthropic"
  readonly name: string;                                // 展示名
  readonly baseUrl?: string;                            // 接入点
  readonly headers?: ProviderHeaders;                   // 固定附加头
  readonly auth: ProviderAuth;                          // 鉴权语义（apiKey / oauth）
  getModels(): readonly Model<TApi>[];                  // 当前已知模型清单（同步）
  refreshModels?(context: RefreshModelsContext): Promise<void>;  // 动态供应商拉取新清单
  stream<T extends TApi>(
    model: Model<T>, context: Context, options?: ApiStreamOptions<T>,
  ): AssistantMessageEventStream;                       // 核心：发起一次流式请求
  streamSimple(model: Model<TApi>, context: Context, options?: SimpleStreamOptions): AssistantMessageEventStream;
  fetchDeferred?(model: Model<TApi>, handle: DeferredHandle, options?): AssistantMessageEventStream;
  cancelDeferred?(model: Model<TApi>, handle: DeferredHandle, options?): Promise<void>;
}
```

逐行拆解：

- `id` 是全局唯一主键。`ModelsImpl` 用它做 `Map` 的 key，第 05 讲 `Model.provider` 也回指它，两者靠字符串对齐。
- `auth: ProviderAuth` 强制每家供应商"至少有某种鉴权语义"——即便像本地无密钥服务那样，也提供一个 `apiKey` 鉴权、其 `resolve()` 只报告"是否已配置"。注释（`models.ts:104`）强调：没有供应商是"无鉴权"的，区别只在凭据来源（环境变量、OAuth、ADC 文件）。
- `getModels()` 是**同步**读当前已知清单。动态供应商（如从 API 拉模型的）在首次 `refreshModels` 前返回空，但绝不会抛异常——`ModelsImpl` 把抛错当成"没有模型"处理。
- `stream` 是重头戏：给它一个 `Model`、一份 `Context`（系统提示 + 消息历史 + 工具，见第 05 讲 `types.ts:509`），它返回一个 `AssistantMessageEventStream`（第 06 讲主角）。**这正是归一化发生的边界**——供应商内部的 SSE 差异在这里被翻译成统一事件流。
- `fetchDeferred` / `cancelDeferred` 是可选的"异步/延迟响应"能力，对应某些供应商的离线与轮询模式；带 `?` 说明不是每家都有。

`TApi` 泛型的意义值得停一下：`anthropicProvider()` 返回的是 `Provider<"anthropic-messages">`，于是它 `stream` 接受的 `Model` 也被约束成对应 API 方言。类型系统在编译期就挡住了"用 OpenAI 的模型去调 Anthropic 的 stream"这种错。

## 二、ModelsImpl：把 N 个 Provider 编排成统一门面

上层（如第 02 讲的 `runLoop`）几乎不直接碰 `Provider`，而是通过一个 `Models` 门面。其默认实现 `ModelsImpl` 在 `models.ts:254`：

```ts
class ModelsImpl implements MutableModels {
  private providers = new Map<string, Provider>();      // 以 provider.id 为 key
  private credentials: CredentialStore;
  private modelsStore: ModelsStore;
  private authContext: AuthContext;

  constructor(options?: CreateModelsOptions) {
    this.credentials = options?.credentials ?? new InMemoryCredentialStore();
    this.modelsStore = options?.modelsStore ?? new InMemoryModelsStore();
    this.authContext = options?.authContext ?? defaultAuthContext();
  }

  getProvider(id: string): Provider | undefined { return this.providers.get(id); }

  getModel(provider: string, id: string): Model<Api> | undefined {
    const entry = this.providers.get(provider);
    if (!entry) return undefined;
    return entry.getModels().find((m) => m.id === id);   // 委托给具体 Provider
  }

  stream<TApi extends Api>(model: Model<TApi>, context, options): AssistantMessageEventStream {
    const provider = this.providers.get(model.provider);  // 用 model.provider 找到归属
    if (!provider) /* 抛 ModelsError */;
    return provider.stream(model, context, options);      // 委托给 Provider 自己发请求
  }
}
```

逐行：

- 第 3 行 `providers` 是一个 `Map`，key 是 `provider.id`。`setProvider` / `deleteProvider`（`:269`、`:274`）都以 `id` 做 upsert/删除，保证唯一。
- `getModel`（`:290` 附近）先按 `provider` 找到供应商，再在它的 `getModels()` 里 `find` 具体 `id`。注意它**不持有模型副本**，模型清单始终由各家 `Provider` 自己权威提供——`ModelsImpl` 只是个路由器。
- `stream` 方法（`:203` 起）是委托的典型：`model.provider` 告诉它该找谁，`providers.get(...)` 拿到 `Provider` 后，把真正的请求**派发**给 `provider.stream(...)`。

这套"门面 + 委托"让上层心智极简：**我只管拿 `Model` 来 `stream`，至于底下是 Anthropic 还是 Bedrock，门面替我路由。** 第 05 讲我们说过 `Model` 与 `Message` 解耦，这里又看到 `ModelsImpl` 与 `Provider` 解耦——两层抽象叠加，才撑起"几十家供应商即插即用"。

## 三、createProvider：用一个工厂收口所有 Provider 的构造

每个内置供应商文件（如 `anthropic.ts`）都不手写 `Provider` 对象，而是调用 `createProvider` 工厂（`models.ts:762`）：

```ts
export function createProvider<TApi extends Api = Api>(input: CreateProviderOptions<TApi>): Provider<TApi> {
  const baselineModels = input.models;                  // 静态基线模型（来自 generated）
  let dynamicModels: readonly Model<TApi>[] = [];        // 动态叠加层
  const currentModels = (): readonly Model<TApi>[] => {  // 合并基线 + 动态
    const merged = [...baselineModels];
    for (const model of dynamicModels) {
      const index = merged.findIndex((e) => e.id === model.id);
      if (index >= 0) merged[index] = model; else merged.push(model);
    }
    return merged;
  };
  const single = typeof (input.api as ProviderStreams).stream === "function"
    ? (input.api as ProviderStreams) : undefined;        // 单一 api 实现？
  const byApi = single ? undefined : (input.api as Partial<Record<string, ProviderStreams>>);  // 否则按 api 分派

  const dispatch = (model, run) => {                    // 根据 model.api 选实现
    const streams = single ?? byApi?.[model.api];
    if (!streams) return lazyStream(model, async () => { throw new ModelsError("stream", `...`); });
    return run(streams);
  };

  const provider: Provider<TApi> = {
    id: input.id, name: input.name ?? input.id, baseUrl: input.baseUrl,
    auth: input.auth, getModels: currentModels,
    stream: (model, context, options) => dispatch(model, (s) => s.stream(model, context, options)),
    /* … */
  };
  return provider;
}
```

逐行：

- `currentModels`（`:766`）处理"静态 + 动态"两层模型：基线来自第 08 讲说的 `models.generated.ts`，动态层（如从供应商 API 拉到的）按 `id` 合并或追加。这样刷新模型清单不会丢失手配的静态项。
- `single` vs `byApi`（`:775`）判断 `api` 是"单一实现"还是"按 `model.api` 分派的多实现"。混用多 API 的供应商（如一个 Provider 同时支持 `openai-responses` 和 `openai-completions`）走 `byApi` 字典。
- `dispatch`（`:781`）是路由核心：根据 `model.api` 选对应 `ProviderStreams`；找不到就返回一个立即 `error` 的流，而不是同步抛错——和第 06 讲 `lazyStream` 的错误归一化一脉相承。
- 返回的 `provider` 对象把 `stream` 等直接委托给 `dispatch`，于是每个供应商文件写的样板代码被压到最少。

**这个工厂的价值**：把"如何构造一个合规 `Provider`"的所有细节（模型合并、API 派发、错误归一）集中到一处。新增供应商 = 写一个调用 `createProvider` 的小函数 + 一份模型清单，不必重复这套逻辑。

## 四、anthropicProvider 与 builtinProviders：内置清单如何装配

具体供应商就是这样被构造的。`anthropicProvider` 在 `providers/anthropic.ts:43`：

```ts
export function anthropicProvider(): Provider<"anthropic-messages"> {
  return createProvider({
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com",
    auth: {
      apiKey: anthropicApiKeyAuth(),                    // 解析 ANTHROPIC_API_KEY 等
      oauth: lazyOAuth({ name: "Anthropic (Claude Pro/Max)", load: loadAnthropicOAuth }),
    },
    models: Object.values(ANTHROPIC_MODELS),            // 来自生成的模型清单
    api: anthropicMessagesApi(),                        // 该供应商的 SSE→事件流实现
  });
}
```

逐行：

- `auth.apiKey` 用 `anthropicApiKeyAuth()`（`:9`），其内部 `resolve` 依次尝试存储凭据、`ANTHROPIC_AUTH_TOKEN`、再到 `ANTHROPIC_API_KEY` 等环境变量——第 08 讲会讲这些变量名从 `env-api-keys.ts:31` 来。
- `models: Object.values(ANTHROPIC_MODELS)` 把第 08 讲生成的 Anthropic 模型清单塞进基线。
- `api: anthropicMessagesApi()` 是该供应商把自家 SSE 翻成 `AssistantMessageEvent` 的实现——第 06 讲归一化的真正执行者。

所有内置供应商在 `providers/all.ts:89` 汇总成一份清单：

```ts
export function builtinProviders(): Provider[] {
  return [
    amazonBedrockProvider(),
    antLingProvider(),
    anthropicProvider(),
    azureOpenAIResponsesProvider(),
    /* … 几十家 … */
    xaiProvider(),
    xiaomiProvider(),
    zaiProvider(),
    zaiCodingCnProvider(),
  ];
}
```

`builtinProviders()` 每次调用都**重新构造一份全新 Provider 实例数组**。上层（如 `ModelsImpl` 的初始化）把它 `setProvider` 逐个装进 `Map`。

> **知识拓展：可插拔接缝 = 扩展的入口**
> `MutableModels.setProvider`（`models.ts:227`）让任意代码注入自己的 `Provider`。这意味着一个扩展可以注册一个"走自家网关的 Anthropic 兼容 Provider"，而 `pi-ai` 的其余代码毫无感知——这正是第 01 讲说的"分层清洁"在供应商层的体现：接入新供应商不需要改 `ModelsImpl`、不需要改 `runLoop`，只要实现一个 `Provider` 接口。

## 试一试

打开 `packages/ai/src/models.ts`，定位 `Provider` 接口（`:97`）和 `ModelsImpl`（`models.ts:254`）。回答：

1. `Provider.stream`（`:136`）的签名里 `model: Model<T>` 的 `T` 受 `TApi` 约束。结合 `anthropicProvider()` 返回 `Provider<"anthropic-messages">`，思考：如果有人把一个 `Model<"openai-responses">` 传进 Anthropic 的 `stream`，类型系统会在哪拦住他？
2. `ModelsImpl.stream`（`:203` 起）先 `providers.get(model.provider)`。如果 `model.provider` 指向一个从未 `setProvider` 过的 id，会发生什么？它和 `createProvider` 里 `dispatch` 找不到 `api` 实现的错误处理有何异同？
3. 翻到 `providers/all.ts:89` 的 `builtinProviders()`，数一数它返回了多少个 `Provider` 工厂调用。这印证了本讲哪一句话？

## 下一讲预告

`builtinProviders()` 里那份长长的模型清单，你一定好奇：几十家供应商、上千个模型的 `id` / `cost` / `contextWindow` 是谁维护的？答案是——它们**不是手写的，是脚本生成的**。下一讲我们进 `models.generated.ts`、看清 `generate-models` 脚本，以及 `compat` 层如何用 `withEnvApiKey` 兜底旧式 API Key。
