---
title: "21 · api/lazy.ts — 同步返回 stream，异步再加载实现"
summary: "理解为什么 streamSimple 的类型是「同步返回 stream」但 auth 和 import() 都是异步的：外层立刻 new AssistantMessageEventStream()，setup Promise 的结果用 "
tags: [pi, ai]
---
源码：`packages/ai/src/api/lazy.ts`  
被谁调用：每个 `*.lazy.ts` 的 `*Api()`；`Models.streamSimple` / `createProvider` 的缺实现分支；`ModelRuntime.streamSimple`。

## 本课目标

理解为什么 `streamSimple` 的类型是「同步返回 stream」但 auth 和 `import()` 都是异步的：外层立刻 `new AssistantMessageEventStream()`，setup Promise 的结果用 `forwardStream` 灌进去，失败变成 `error` 事件。

## 在系统中的位置

```text
compat: anthropicMessagesApi() === lazyApi(() => import("./anthropic-messages.ts"))
  streamSimple(model, ctx, opt)
    lazyStream(model, async () => (await load()).streamSimple(...))

Models.streamSimple
  lazyStream(model, async () => {
    applyAuth...
    return provider.streamSimple(...)
  })
```

Agent 的 `for await` 可以立刻开始等事件。第一件事件可能要等 SDK 加载 + 鉴权 + HTTP 头。

## `lazyStream`

```ts
export function lazyStream(model, setup: () => Promise<AsyncIterable<AssistantMessageEvent>>) {
  const outer = new AssistantMessageEventStream();
  setup()
    .then((inner) => forwardStream(outer, inner))
    .catch((error) => {
      const message = createSetupErrorMessage(model, error);
      outer.push({ type: "error", reason: "error", error: message });
      outer.end(message);
    });
  return outer;
}
```

`createSetupErrorMessage`：空 content、零 usage、`stopReason: "error"`、`errorMessage` 来自 Error.message。没有 `start` 事件——符合「请求还没发出去就可以直接 error」的协议。

`forwardStream`：把内层每件事件 `push` 到外层，结束时 `outer.end(inner.result())`。若内层没有 `result()`（普通 AsyncIterable），`end(undefined)`。`AssistantMessageEventStream` 在看到 `done`/`error` 时已经 resolve 了自己的 result Promise，再 `end` 只是叫醒还在等的迭代器。

setup 成功后内层自己会发 `start`…`done`。外层是透明管子。

## `lazyApi`

```ts
export function lazyApi(load: () => Promise<ProviderStreams>, capabilities?): ProviderStreams {
  return {
    stream: (m,c,o) => lazyStream(m, async () => (await load()).stream(m,c,o)),
    streamSimple: (m,c,o) => lazyStream(m, async () => (await load()).streamSimple(m,c,o)),
    // 可选 fetchDeferred / cancelDeferred
  };
}
```

`load()` 每次调用都会 `await load()`，但动态 `import()` 有模块缓存，只有第一次付代价。

`capabilities.fetchDeferred: true` 才挂 `fetchDeferred`。调用时若加载到的模块没有实现，throw「API does not support deferred responses」，被 lazyStream 收成 error 事件。`cancelDeferred` 是 Promise 不是 stream，throw 会穿到调用方——这是唯一不走事件的延迟 API。

## 和「缺 key 同步 throw」的关系

`lazyApi` 包的是整个 `streamSimple(...)` 调用。若实现里 `streamSimple` **在返回 stream 之前** throw（缺 key），这个 throw 发生在 `setup` 的 async 函数里，变成 outer 的 `error` 事件。

compat 的 `wrapStreamSimple` **直接**调 `streamSimple`，不经 `lazyStream`（lazy 在更里层：`lazyApi` 的 streamSimple 才是 lazyStream）。等一下——`anthropicMessagesApi()` 就是 `lazyApi(...)`，compat 注册的是 lazy wrapper。所以：

```text
compat.streamSimple
  → wrapStreamSimple
    → lazyApi.streamSimple          // 这层是 lazyStream
      → 真正的 anthropic streamSimple  // 缺 key 在 setup 里 throw
        → error 事件
```

那 03 课说的「缺 key 同步 throw」什么时候发生？当测试 **直接** `import { streamSimple } from "../src/api/anthropic-messages.ts"` 时，没有 lazy 外壳。`StreamFunction` 合约允许这种同步 throw。经 compat / Models 的路径，throw 被收成事件。

`getClientApiKey` 在 `streamSimple` 函数体顶部，不在内层 async IIFE。所以直接调用会同步炸；经 lazyApi 会变成事件。

## 失败与边界

| 情况 | 行为 |
|---|---|
| `import()` 失败 | error 事件，message 是模块找不到 |
| applyAuth throw | 同上 |
| 内层 stream 发完 done 后 setup 又 throw | 不会，then 只 forward |
| 调用方没消费 outer | setup 仍跑，HTTP 仍发。和直接 stream 一样 |
| cancelDeferred 无实现 | Promise reject，不是事件 |

## 下一课

中性选项如何变成 maxTokens / thinking budget：[22-api-simple-options.ts.md](/series/pi-source/ai/083-api-simple-options-ts/)。
