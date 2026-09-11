---
title: "40 · remote-catalog-provider.ts — 内置厂家的远端目录"
summary: "内置模型表打进二进制。pi.dev 上的目录可以更新 id/价格/窗口，而不发新版本。4 小时内不重复打网络（REMOTECATALOGREFRESHINTERVALMS）。304 必须已有缓存 body，否则不拿空 etag 去验证，"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/remote-catalog-provider.ts`  
被谁调用：`ModelRuntime.create` 对非 radius 的 builtin `withRemoteCatalog`。

## 本课目标

内置模型表打进二进制。pi.dev 上的目录可以更新 id/价格/窗口，而不发新版本。4 小时内不重复打网络（`REMOTE_CATALOG_REFRESH_INTERVAL_MS`）。304 必须已有缓存 body，否则不拿空 etag 去验证，避免 overlay 被清空。

## `withRemoteCatalog`

包装 Provider：`getModels` = 内置 ∪ `dynamicModels`（同 id 远端覆盖）。`refreshModels`：

1. 从 `context.stored` 恢复比本地 `builtinModelDataGeneratedAt` 新的条目
2. `context.publish` 把 dynamic 设上
3. `allowNetwork` 且间隔到了才 GET 目录（4s attempt timeout，User-Agent 带版本）
4. 合并后写回 store

`parseCatalog` 接受数组、`{ models: [] }` 或 id 映射对象。

## 失败与边界

网络失败保留已恢复的 overlay。`PI_OFFLINE` / `allowNetwork: false` 只用磁盘缓存。radius 不走这层（它的模型来自网关）。自定义 catalogBaseUrl 可测。

## 下一课

[41-provider-composer.ts.md](/series/pi-source/coding-agent/537-provider-composer-ts/)：三层厂家如何焊成一个 Provider。
