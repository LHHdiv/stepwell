---
title: "05 · index.ts — 根导出清单"
summary: "对照 package.json 的 exports 字段，知道哪些 API 必须从子路径进，避免在应用代码里 import 到 Node-only 模块。本文件本身没有逻辑。"
tags: [pi, chord]
---
源码：`packages/chord/src/index.ts`  
被谁调用：`import { ... } from "@earendil-works/chord"`。

## 本课目标

对照 `package.json` 的 exports 字段，知道哪些 API 必须从子路径进，避免在应用代码里 `import` 到 Node-only 模块。本文件本身没有逻辑。

## 在系统中的位置

```text
@earendil-works/chord              → src/index.ts     平台中性运行时
@earendil-works/chord/context      → context/index.ts
@earendil-works/chord/delta        → delta/index.ts
@earendil-works/chord/bundler      → bundler.ts       Node + esbuild
@earendil-works/chord/node         → node.ts          Node vm loader
```

PLANNING 要求：import 主运行时不得加载 Node-only 模块。所以 `bundleFacets`、`createFacetBundleLoader` 不在本文件。

## 实际导出

**值：**

- 来自 `api.ts`：`combineFacetLoaders`、`createFacetHost`、`createRemoteServiceBinding`、`createStaticFacetLoader`、`defineFacet`、`defineService`、`replicatedState`
- `isJsonValue`
- 错误：`isRemoteServiceErrorCode`、`REMOTE_SERVICE_ERROR_CODES`、`RemoteServiceError`
- provider：`createRemoteServiceEndpoint`、`RemoteServiceProvider`
- state-codec：`createServiceStateEncoder` / `Decoder`
- wire：所有 `createService*Call`、`decodeServiceControlCall`、`parse*`

**类型：** `types.ts` 那一长串，外加 endpoint / codec / wire 的类型。

## 刻意不从根出去的

| 符号 | 从哪进 | 原因 |
|---|---|---|
| `BACKGROUND_CONTEXT`、`withCancel` | `/context` | 通用名 |
| `track`、`apply`、`encoder` | `/delta` | 独立原语，避免和 replicatedState 搅在一起 |
| `bundleFacets` | `/bundler` | esbuild |
| `createFacetBundleLoader` | `/node` | `node:vm`、`node:fs` |
| `FacetKernel` | 不导出 | 私有实现 |
| `MutableReplicatedStateImpl` | 不导出 | 用 `replicatedState()` |
| `ServiceSlot`、`InstanceDirectory` | 不导出 | host 内部 |

Pi 的 server/client 从根拿 `parseServiceCall` 和 `createRemoteServiceEndpoint`，自己包传输。不要从根去找 Context 常量——那会和「Chord 主 API 应该短」的设计对着干。

## 失败与边界

无运行时失败。若打包器 tree-shake 失败把 wire/provider 整棵拉进来，那是打包配置问题，不是这个 barrel 的错。`sideEffects: false` 已声明。

## 下一课

[06-delta.index.ts.md](/series/pi-source/chord/339-delta-index-ts/)：状态复制底下的 JSON diff。README 并进那课。
