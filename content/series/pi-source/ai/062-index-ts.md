---
title: "01 · index.ts — 主入口故意很瘦"
summary: "读完应能指出：主入口导出了什么、故意没导出什么、为什么注释第一句就是 “Core only, side-effect free”。这是包边界，不是实现。"
tags: [pi, ai]
---
源码：`packages/ai/src/index.ts`  
被谁调用：`import { ... } from "@earendil-works/pi-ai"`。coding-agent 的 ModelRuntime / 类型也从这里拿。旧代码如果写的是 `from "@earendil-works/pi-ai"` 再找 `streamSimple`，会找不到——那是 `compat` 的活。

## 本课目标

读完应能指出：主入口导出了什么、**故意没导出什么**、为什么注释第一句就是 “Core only, side-effect free”。这是包边界，不是实现。

## 在系统中的位置

```text
@earendil-works/pi-ai            ← 本文件（无副作用）
@earendil-works/pi-ai/compat     ← streamSimple / getModel / 注册 builtin API
@earendil-works/pi-ai/api/*      ← 一种协议一份实现
@earendil-works/pi-ai/providers/*← 厂家工厂（本课表不写）
```

`package.json` 的 `main` 指向 `dist/index.js`。`sideEffects` 名单里没有它。

## 文件在做什么

48 行，全部是 `export`。按块读：

### TypeBox 再导出

```ts
export type { Static, TSchema } from "typebox";
export { Type } from "typebox";
```

工具参数 schema 用 TypeBox。调用方不必自己依赖 `typebox`，从 pi-ai 拿 `Type.Object(...)` 即可。

### 各 API 的 Options 类型（type-only）

从 `api/anthropic-messages.ts` 等到 `api/pi-messages.ts` **只 re-export 类型**。TypeScript 的 type-only import 在 emit 时擦掉，所以主入口不会把 Anthropic SDK、OpenAI SDK 拉进运行时图。

这是 `types.ts` 里 `ApiOptionsMap` 能按 `model.api` 给出精确选项类型的基础。

### `export * from "./api/lazy.ts"`

`lazyStream` / `lazyApi` 是运行时值。它们不 import 任何厂家实现，只包一层「setup 异步、stream 同步返回」。`createProvider` 和 `Models.streamSimple` 都靠它。

### auth 四件套

`auth/context.ts`、`credential-store.ts`、`helpers.ts`、`types.ts` 全部 `export *`。新产品自己 `createModels({ credentials, authContext })`，不经过 compat。

OAuth 的**实现**（`auth/oauth/anthropic.ts` 那些 Node http 回调服务器）不从主入口出来。厂家工厂用 `lazyOAuth(() => loadAnthropicOAuth())` 按需加载。

### 扩展兼容类型

`OAuthAuthInfo` 等从 `compat/extension-oauth-types.ts` **只 export type**。coding-agent 扩展作者声明 login 回调时用这些旧名字。实现不在这里。

### 模型运行时

`images-models.ts`、`models.ts`、`models-store.ts`：`createModels` / `createProvider` / `createImagesModels`。这是新产品该走的路。

### `providers/faux.ts`

假厂家，给测试和扩展沙箱用。它是纯内存、无网络，放主入口不会把 AWS SDK 拖进来。

### 会话资源

`session-resources.ts`：Codex WebSocket 连接在会话结束时要关。主入口暴露 `registerSessionResourceCleanup` / `cleanupSessionResources`。

### 核心类型与部分 utils

`types.ts` 是合约。utils 只挑会被 Agent / 扩展直接碰到的：`event-stream`、`overflow`、`retry`、`validation`、`uuidv7`、`contentText`。`provider-retry`、`error-body`、`node-http-proxy` 留在 `api/*` 内部。

## 故意没有的东西

| 你可能以为在这 | 实际在哪 |
|---|---|
| `streamSimple` / `stream` / `complete` | `@earendil-works/pi-ai/compat` |
| `getModel` / `getModels` / `getProviders` | compat（deprecated 别名）或 `providers/all` |
| `streamAnthropic` 这类旧别名 | `legacy-api-aliases.ts`，经 compat 再导出 |
| 厂家工厂 `anthropicProvider()` | `@earendil-works/pi-ai/providers/anthropic` |
| OAuth login 实现 | `auth/oauth/*`，经 `lazyOAuth` 加载 |
| `generateImages` 全局函数 | compat → `images.ts`（有副作用：注册 builtin 图像 API） |

注释写了：This module is the new surface; the old global API lives under `/compat` and is deleted with the coding-agent ModelManager migration.

## 失败与边界

主入口本身没有运行时逻辑，不会 throw。失败来自你 import 错入口：

- 从 `@earendil-works/pi-ai` 找 `streamSimple`：编译期就没有这个导出。
- 从主入口 import 某个 `api/*.ts` 的 **值**（比如直接 `import { stream } from ".../api/anthropic-messages"`）会加载那一家 SDK。主入口避免了这件事，子路径 `@earendil-works/pi-ai/api/anthropic-messages` 是给明确想加载实现的人用的。

## 下一课

合约在 [02-types.ts.md](/series/pi-source/ai/063-types-ts/)。把 `AssistantMessageEvent` 画下来再读 compat，否则 SSE 译码会对不上 agent-loop 的 `for await`。
