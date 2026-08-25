---
title: 第40讲·LlmAdapter：一个接缝，无限模型
summary: 精读 llm 包的适配器抽象：dsh 如何用一条 AsyncIterable<StreamChunk> 接缝统一所有模型供应商。
objectives:
  - 读懂 LlmAdapter 抽象类的职责边界
  - 理解 registerAdapter 注册机制与 llm/stream 瀑布
  - 能说出写一个新适配器需要实现什么
tags: [deepseek-harness, llm, 适配器模式]
keyPoints:
  - LlmAdapter 是抽象类，子类负责把内部词汇翻译成具体供应商的协议
  - 适配器通过 ctx.llm.registerAdapter 注册，支持多供应商并存
  - llm/stream 是瀑布拦截点：日志、计量、重试都在这里挂载
---

卷五：LLM 层。前面所有模块都只认一种语言——Message/ContentBlock/StreamChunk（第 11 讲）。谁负责把这门"内部语言"翻译成 DeepSeek 的 HTTP 协议？答案：`packages/llm/llm-deepseek`。而规定"翻译官上岗资格"的，是 `packages/llm/llm` 里的 **LlmAdapter** 抽象类。

## 抽象类定义了什么

打开 `packages/llm/llm/src/index.ts`（1027 行），剥去周边，核心抽象是：

```ts
export abstract class LlmAdapter {
  // 描述本适配器支持的模型元信息（名字、上下文长度…）
  abstract providerInfo(provider: string): LlmProviderInfo;

  // 核心：给定请求，产出一个流式分片的异步迭代器
  abstract generate(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
```

就这两个核心成员。**GenerateOptions 里装的是内部词汇**：消息列表（第 11 讲的 Message[]）、工具清单、采样参数。**返回值是 StreamChunk 流**。适配器的全部使命：进，把内部 Message 翻译成供应商的请求格式；出，把供应商的响应流翻译回内部 StreamChunk。

为什么用 `AsyncIterable`？因为它是对"逐步产生值的过程"的最小抽象。HTTP SSE 是它，本地推理引擎的回调也是它，甚至一个假模型（测试用，逐字返回固定台词）也是它。**循环和适配器之间只通过这个接口对话**，于是换供应商 = 换适配器，其余代码零改动——这就是适配器模式的教科书实现。

## 注册：多供应商并存

适配器不搞全局单例，而是注册进服务：

```ts
ctx.llm.registerAdapter(['deepseek'], new DeepSeekAdapter());
ctx.llm.registerAdapter(['openai'], new OpenAIAdapter());
```

第一个参数是本适配器接管的供应商名列表。请求里指定 `provider: 'deepseek'` 时，服务路由到对应适配器。这意味着你的智能体可以**同时接多家模型**——主脑用 DeepSeek，子任务用便宜的小模型，全在一套系统里。

## llm/stream：又一条瀑布

第 22 讲见过工具的三段瀑布，LLM 层同样有一条：

```ts
'llm/stream'(options, next): AsyncIterable<StreamChunk>
```

任何插件都能拦截这个事件：在 `next()` 之前做前置处理（注入缓存命中的假响应、记录请求），之后包装返回的流（统计 token 用量、自动重试、把流内容写入日志）。第 02 讲生命线里的 `llm/stream` 事件，就是这条瀑布的入口。**你以后想给模型调用加"用量统计"或"自动重试"，都不用碰适配器本身**——写个瀑布监听插件即可。

## 写一个新适配器要做什么

清单（下一讲读 DeepSeek 实现时逐项对照）：

1. 请求翻译：Message[] → 供应商的请求体格式；
2. 发起 HTTP 请求，处理鉴权（API key 从 credentials 服务取，不硬编码）；
3. 响应流解析：SSE 行 → StreamChunk；
4. 工具调用格式互译：内部的 tool_use 块 ↔ 供应商的 function call 格式；
5. 错误翻译：供应商错误码 → dsh 的错误类型。

## 试一试

打开 index.ts，搜索 `registerAdapter`，读它的函数签名和实现（约十几行）。思考一个问题：如果两个适配器注册了相同的供应商名，后注册的会覆盖先注册的吗？从代码里找出答案。

## 下一讲预告
读第一个真实适配器：llm-deepseek。看 SSE 字节流如何一步步变成屏幕上蹦出的字。
