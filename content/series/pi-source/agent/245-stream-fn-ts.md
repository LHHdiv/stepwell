---
title: "04 · stream-fn.ts — 本包不绑厂家，只留一个注入孔"
summary: "理解为什么 @earendil-works/pi-agent-core 的 dependencies 里没有具体 Provider SDK，却能跑通模型调用。答案就这 20 行。"
tags: [pi, agent]
---
源码：`packages/agent/src/stream-fn.ts`  
被谁调用：`Agent` 构造时若没传 `streamFn` 就 `getDefaultStreamFn()`；coding-agent `sdk.ts` 在 `new Agent` 之前 `setDefaultStreamFn(streamSimple)`。

## 本课目标

理解为什么 `@earendil-works/pi-agent-core` 的 dependencies 里没有具体 Provider SDK，却能跑通模型调用。答案就这 20 行。

## 在系统中的位置

```text
packages/ai  streamSimple
       ↑
coding-agent sdk.ts  setDefaultStreamFn(streamSimple)
       ↑
packages/agent Agent  options.streamFn ?? getDefaultStreamFn()
       ↑
agent-loop streamAssistantResponse
```

harness **不走** 这个默认值。它直接 `lane.models.streamSimple(...)`，`Models` 由宿主传入 `AgentHarness.create`。

## 两个函数

模块级变量 `defaultStreamFn`。`setDefaultStreamFn(undefined)` 可以清掉，测试会用。

`getDefaultStreamFn()` 在未配置时 throw：

```text
No default stream function configured. Pass streamFn explicitly or call setDefaultStreamFn().
```

这是刻意的：core 包不能 `import { streamSimple } from "@earendil-works/pi-ai"` 的高层入口，否则循环依赖、也把「模型目录 / 兼容层」焊进 core。注释原意：宿主安装自己的默认运行时，不必让 pi-agent-core 依赖厂家目录。

`package.json` 的 `exports["."]` 只公开 `setDefaultStreamFn`，不公开 getter。getter 是给本包内部 Agent 用的。

## 和 `proxy.ts` 的关系

桌面/Web 若不能直连厂家，宿主这样配：

```ts
new Agent({
  streamFn: (model, context, options) =>
    streamProxy(model, context, { ...options, authToken, proxyUrl }),
})
```

这是构造参数，不必也不该去改全局 default。全局 default 是给「省略 streamFn」的 SDK 路径。

## 失败与边界

- 单测直接 `new Agent({...})` 却忘了 `streamFn` 和 `setDefaultStreamFn`：第一次 `prompt` 在进 loop 时炸。
- 两个宿主同进程先后 `setDefaultStreamFn`：后写覆盖先写。coding-agent 进程里只有一个 SDK 入口，所以安全；库作者若把 Agent 嵌进更大的运行时，应显式传 `streamFn`。

## 下一课

[05-index.ts.md](/series/pi-source/agent/246-index-ts/)：看 npm 入口把哪些 harness 类型一并倒出去。现行 CLI 用不到那些 export，但 `import { Agent } from "@earendil-works/pi-agent-core"` 已经把它们带进类型空间。
