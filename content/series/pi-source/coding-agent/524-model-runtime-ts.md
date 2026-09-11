---
title: "35 · model-runtime.ts — 模型与认证的运行时门面"
summary: "ModelRuntime 实现 pi-ai 的 Models 接口，但多了产品层：models.json、扩展厂家、运行时 API key、远端目录缓存、凭证写盘后的 snapshot 同步。读完应能指出 create 为何默认 all"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/model-runtime.ts`（约 800 行）  
被谁调用：`createAgentSessionServices` 的 `ModelRuntime.create`；sdk 的 `streamFn`；auth 子命令；扩展经 ModelRegistry。

## 本课目标

`ModelRuntime` 实现 `pi-ai` 的 `Models` 接口，但多了产品层：`models.json`、扩展厂家、运行时 API key、远端目录缓存、凭证写盘后的 snapshot 同步。读完应能指出 `create` 为何默认 `allowModelNetwork: false`，以及 `getAuth` 和 `checkAuth` 的差别。

## 在系统中的位置

```text
ModelRuntime.create({ authPath, modelsPath, allowModelNetwork, refreshOnCreate })
  AuthStorage / RuntimeCredentials
  ModelConfig.load(models.json)
  FileModelsStore(models-store.json)
  builtinProviders + withRemoteCatalog
  refresh({ allowNetwork })
sdk streamFn → modelRuntime.streamSimple(model, context, options)
```

CLI 启动：`allowModelNetwork` 实际还受 `PI_OFFLINE` 影响（构造里 `modelNetworkEnabled = process.env.PI_OFFLINE === undefined`）。services 层再传 `allowNetwork: false` 给第一次 refresh。

## `create` 逐步

1. 凭证：传入的 CredentialStore，或 `AuthStorage.create(authPath)`。
2. `modelsPath === null` 表示不要 models.json（auth check 用内存 store）。
3. 内置厂家来自 `@earendil-works/pi-ai/providers/all`，radius 以外包一层远端目录。
4. `configureRadiusProviders`：models.json 里 `oauth: "radius"` 的条目变成 radius 网关厂家。
5. `rebuildProviders`：对每个 id `composeModelProvider(builtin, models.json, extension)`。
6. `refreshOnCreate !== false` 则 `refresh`。

## 厂家三层

`builtins` ← 内置 + radius 配置  
`nativeExtensionProviders` ← 扩展 `registerNativeProvider`（完整 Provider 对象）  
`extensionProviders` ← 扩展 `registerProvider(name, config)`  
`ModelConfig` ← 用户 models.json

`composeModelProvider` 把它们焊成一个 `Provider`。焊失败进 `compositionErrors`，`getError()` 拼出来。

## 认证

`checkAuth`：有没有配置好的凭证类型，尽量轻。  
`getAuth`：真正解析 key/headers，OAuth 可能 refresh 并 persist。对 **model** 重载还会 `resolveConfiguredModelHeaders`（models.json 里该模型的额外头）。

登录/登出/setRuntimeApiKey 走 `enqueueCredentialOperation`：同一 provider 串行，避免两个 refresh 写坏 auth.json。写盘成功但 snapshot 刷新失败 → `CredentialSynchronizationError`（凭证已变，内存表旧）。

`RuntimeCredentials` 覆盖层：`--api-key` 不写盘，`read` 优先 overlay。

## stream

`stream` / `streamSimple` 委托给内部 `createModels()` 的集合。sdk 再包超时、retry、归因头、扩展 `before_provider_headers`。

## 失败与边界

没有模型时 create 仍成功。`getAvailable()` 无 providerId 时先 `queueAvailabilityRefresh`。扩展登记厂家必须在 refresh 前（08 课）。`PI_OFFLINE` 关掉网络目录，不关掉用户主动的 chat HTTP。

## 下一课

[36-model-resolver.ts.md](/series/pi-source/coding-agent/526-model-resolver-ts/)：`--model`、`--models`、会话恢复如何变成一个 Model 对象。
