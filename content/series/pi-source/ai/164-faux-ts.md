---
title: "faux.ts — 不上网的厂家，把 Agent 测成可编排的剧本"
summary: "faux 证明「厂家工厂」和「真实 HTTP 协议」可以完全脱开：它实现同一套 Provider + stream/streamSimple/fetchDeferred/cancelDeferred，但响应是测试预写的 Assistan"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/faux.ts`  
核心导出：`fauxProvider`、`createFauxCore`、`fauxAssistantMessage`、`fauxText` / `fauxThinking` / `fauxToolCall`  
被谁调用：**不进** `builtinProviders()`。`packages/ai/src/index.ts` 对整个文件 `export *`，agent 测试 harness 直接 `fauxProvider()` 再 `models.setProvider(faux.provider)`。compat 另有 `registerFauxProvider` 挂到旧全局表。

## 本课目标

faux 证明「厂家工厂」和「真实 HTTP 协议」可以完全脱开：它实现同一套 `Provider` + `stream`/`streamSimple`/`fetchDeferred`/`cancelDeferred`，但响应是测试预写的 `AssistantMessage`。读完应能：

- 用 `setResponses` 排一队回复，断言 Agent 循环打了几次电话
- 看懂 delta 是怎么从完整 message **切回去** 冒充流
- 知道为什么 `model.api` 默认是随机的 `"faux:..."`，避免和内建协议撞名

## 这个文件在系统中的位置

```text
测试
  const faux = fauxProvider()
  createModels().setProvider(faux.provider)
  faux.setResponses([fauxAssistantMessage("hi"), fauxToolCall(...)])
  agent.prompt(...)
    streamFn → Models.streamSimple → faux 的 stream
      从队列 shift 一条 → streamWithDeltas 推 start/text_delta/.../done
```

三层对照：

| 层 | 内建厂家 | faux |
|---|---|---|
| 工厂 | `openaiProvider()` | `fauxProvider()` → 同样 `createProvider` |
| 协议 | `openai-responses.ts` | 本文件里的 `createFauxCore().stream`，**没有** `src/api/faux.ts` |
| 模型表 | json | 默认一款 `faux-1`，或 `options.models` |

它故意不进 `all.ts`：产品进程不该看到「假模型」。谁要测谁登记。

## 导出什么

### 积木

- `fauxText` / `fauxThinking` / `fauxToolCall`：三种 assistant content block。toolCall 不传 id 就 `tool:${Date.now()}:...`
- `fauxAssistantMessage(content, options)`：拼一条完整 `AssistantMessage`。`api`/`provider`/`model` 先写成默认值，真正 stream 时 `cloneMessage` 改成这次请求的模型。`stopReason` 默认 `"stop"`。

### `createFauxCore(options)`

纯核心：模型列表、响应队列、`stream`/`fetchDeferred`/`cancelDeferred`、`state`。compat 的 `registerFauxProvider` 用它，自己再 wrap 成旧注册表条目。

### `fauxProvider(options): FauxProviderHandle`

核心外包一层 `createProvider`：

```ts
auth: { apiKey: { name: "Faux", resolve: async () => ({ auth: {} }) } },
api: { stream, streamSimple, fetchDeferred, cancelDeferred },
```

`resolve` 永远成功且不带 key——faux 是「环境里总是已配置」的厂家。`getAuth` 不会挡测试。

Handle 上的 `setResponses` / `appendResponses` / `getPendingResponseCount` / `state` / `getModel` 是测试控制面。

## 如何鉴权 / baseUrl

鉴权：空对象，恒成功。不读环境变量。

`baseUrl`：模型上写死 `http://localhost:0`。没有任何 fetch 会打这个地址。`tokensPerSecond` 只影响 `setTimeout` 间隔，用来测 UI 流式渲染，不是网速。

## 和 all.ts 的关系

**无。** `all.ts` 不 import faux。`index.ts` 把它放进核心包导出，因为测试和嵌入式脚本需要，产品装配不需要。若有人把 `faux.provider` `setProvider` 进 `builtinModels()` 那份集合，会多出一家 `"faux"`（或你传入的 `provider` id），真实用户的 `/login` 列表不该出现它。

## 逐步精读

### 默认模型

不传 `models` 时一款：`faux-1`，128k 窗口，图文都收，`reasoning: false`。`api` 默认 `randomId("faux")`，形如 `faux:1710...`，保证两次 `fauxProvider()` 的协议名不同，避免全局 api-registry 残留。

### 响应队列

`stream` 一进来 `pendingResponses.shift()`，`callCount++`。队列空：造一条 `stopReason: "error"`，`errorMessage: "No more faux responses queued"`，推 `error` 事件。测试漏写回复会立刻失败，而不是挂起。

队列元素可以是现成 `AssistantMessage`，也可以是 `FauxResponseFactory(context, options, state, model)`——按这次 prompt 内容分支（例如看到 tool result 再决定下一句）。

### 把完整消息切成流：`streamWithDeltas`

真实协议是「边收 SSE 边拼 partial」。faux 相反：先有完整 content，再按 3–5 token 一块（可配 `tokenSize`）切开往外推。thinking / text / toolCall 三种 block 都走 start → delta → end。`signal.aborted` 在块之间检查，推 `error/aborted`。

`stopReason === "pending"` 直接 throw（剧本不完整）。`error`/`aborted` 走 error 事件。其余 `done`。

这让 Agent 循环以为自己在对流，工具调用、思考折叠、中止路径都能测。

### usage 与假 cache

`withUsageEstimate` 用「字符/4」估 token。若 `options.sessionId` 且 `cacheRetention !== "none"`，按与上次 prompt 的公共前缀假装 cacheRead/cacheWrite。用来测费用展示和 cache 相关 UI，不是协议兼容性。

### deferred

`options.deferred` 为真时不立刻兑现剧本：登记一个 `DeferredHandle`，先流一条 `stopReason: "deferred"` 的空消息。后续 `fetchDeferred`：

- `pendingFetches > 0`：再返回 deferred（模拟「还没好」的轮询）
- 否则执行当初那条 step，缓存 `entry.final`，之后同一 handle 稳定

`cancelDeferred` 把 handle 推进 `state.cancelledDeferred`，标 `cancelled`。再 fetch 会 throw。Agent 的后台任务/可取消生成靠这条路径测。

所有实际工作都在 `queueMicrotask` 里，`stream()` 同步返回 event stream——和 `lazyStream` 的「先给流再异步 setup」同构。

## 失败与边界

- `tokensPerSecond <= 0` 或未设：每块 `queueMicrotask`，测试跑得快。设了正数会真 `setTimeout`，CI 里不要默认打开。
- `cloneMessage` 用 `structuredClone`。剧本里放不可克隆的东西（函数、stream）会炸。
- 默认 `provider` 恒为 `"faux"`。两个 `fauxProvider()` 都 `setProvider` 到同一 `Models` 会互踩 id。要并存就传 `provider: "faux-a"`。
- faux **不是** `KnownApi`。`hasApi(model, "openai-responses")` 为 false。测协议差异不要用 faux 冒充 OpenAI，除非你自己把 `api: "openai-responses"` 传进去——那时也只是标签，不会走 OpenAI 实现。

## 下一课

回到产品厂家。动态目录、不走 `createProvider` 的例外：[radius.ts](/series/pi-source/ai/210-radius-ts/)。json 怎么变成 `OPENAI_MODELS`：[00-data-json目录.md](/series/pi-source/ai/061-data-json%E7%9B%AE%E5%BD%95/)。
