---
title: 第12讲·Provider 与 createProvider：14 行接入 DeepSeek
summary: 精读 models.ts 的 Provider 抽象与 deepseek.ts 的极简实现——看懂"协议×供应商"矩阵。
objectives:
  - 读懂 Provider 接口的 auth/getModels/stream 三要素
  - 通过 deepseek.ts 的 14 行理解工厂模式
  - 理解 Models 集合如何做请求路由
tags: [pi, pi-ai, 供应商]
keyPoints:
  - Provider 自带 auth 解析、模型目录、stream 方法
  - 供应商文件极薄：协议复用 openai-completions，只声明 baseUrl 和模型数据
  - Models 集合按 model id 路由到拥有它的 provider
---

第 10 讲说了"协议×供应商"双维度。今天看这个设计落地后的样子——先看抽象，再看最薄的真实案例。

## Provider 接口：三要素

`packages/ai/src/models.ts`（945 行）第 97 行起：

```ts
export interface Provider<TApi extends KnownApi> {
  id: ProviderId;
  name: string;
  auth: AuthResolver;            // 凭据怎么解析（API key 或 OAuth）
  getModels(): Model<TApi>[];    // 模型目录（同步）
  refreshModels?(): Promise<void>; // 可选：动态刷新
  stream(...);                   // 发起流式请求
  streamSimple(...);
}
```

**auth（凭据）、models（目录）、stream（通道）**——一个供应商的全部三要素。注意 auth 是个**解析器**而非裸 key：它知道从 auth.json 或环境变量找凭据，把"凭据从哪来"也抽象掉了。

## DeepSeek 适配器：全文 14 行

`packages/ai/src/providers/deepseek.ts`，全文：

```ts
export function deepseekProvider(): Provider<"openai-completions"> {
  return createProvider({
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    auth: { apiKey: envApiKeyAuth("DeepSeek API key", ["DEEPSEEK_API_KEY"]) },
    models: Object.values(DEEPSEEK_MODELS),
    api: openAICompletionsApi(),
  });
}
```

逐行品味：没有一行 HTTP 代码、没有一行 SSE 解析——因为 `api: openAICompletionsApi()` 直接复用了协议适配器。DeepSeek 兼容 OpenAI 协议，所以接入成本只剩"报个名字、给个地址、声明凭据变量、带上模型目录"。

**模型目录也不手写**：`DEEPSEEK_MODELS` 来自 `data/deepseek.json` 数据文件（构建时刷新）。加一个新模型 = 改一行 JSON。

这就是"协议×供应商"矩阵的威力：35+ 供应商共享 10 个协议适配器，每个供应商文件都薄得像配置。对照 dsh 的 llm-deepseek（第 41 讲，三件套完整实现）——dsh 选择把翻译逻辑握在自己手里，pi 选择最大化复用 OpenAI 兼容生态。**两种取舍，各有代价**：pi 的方式接入快，但协议差异的细节处理不如专用适配器精细。

## Models 集合：路由中枢

运行时所有 provider 注册进 `Models` 集合（models.ts 第 156 行）。它的职责一句话：**给我一个 model id，我找到拥有它的 provider 并把请求委托过去**。上层（agentLoop）永远只面对"模型 id"，不关心背后是哪家——换模型就是改一个字符串。

## 试一试

打开 `src/providers/` 目录，按文件大小排序。最薄的几个供应商是不是都标着 `openai-completions`？找一个**不**兼容 OpenAI 协议的供应商（比如 anthropic），看它的 `api:` 字段——是不是换成了专属协议适配器？

## 下一讲预告
pi-ai 收官：把 types、EventStream、Provider 串成一次真实的流式调用。然后进入卷三——核心循环 agentLoop。
