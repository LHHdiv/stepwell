---
title: "radius.ts — 不走 createProvider 的动态厂家"
summary: "对照 openai.ts：OpenAI 是 createProvider({ models: Object.values(OPENAIMODELS), api: ... })。Radius 手写一个满足 Provider<\"pi-mes"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/radius.ts`  
核心导出：`radiusProvider`、`RadiusProviderOptions`  
被谁调用：`all.ts` 的 `builtinProviders()` **以及** `export { radiusProvider }` 再导出。

## 本课目标

对照 [openai.ts](/series/pi-source/ai/194-openai-ts/)：OpenAI 是 `createProvider({ models: Object.values(OPENAI_MODELS), api: ... })`。Radius 手写一个满足 `Provider<"pi-messages">` 的对象，因为：

1. 没有静态 json / `*.models.ts`
2. `refreshModels` 要处理 ModelsStore 恢复、旧 OAuth 目录迁移、再拉网关
3. 目录活在闭包变量 `let models` 里，初始可能是 `[]`

读完应能指出 `createProvider` 的 `fetchModels` 其实也能覆盖「拉网关」——Radius 仍手写，是历史路径 + 遗留凭证导入，不是协议特殊。协议照样是一份 `piMessagesApi()`。

## 这个文件在系统中的位置

```text
radiusProvider({ gateway? })
  闭包 models = getRadiusModels(id, undefined)  // 通常 []
  refreshModels:
    1. context.stored → 恢复
    2. 无 stored 且 oauth 凭证上有 gatewayConfig → 导入并 persist
    3. allowNetwork → loadRadiusGatewayConfig → publish
  stream / streamSimple → piMessagesApi()
```

`Models.refresh()` 对带 `refreshModels` 的厂家：先 `allowNetwork: false` 只恢复磁盘，再在有凭证时联网。产品启动可以先亮出上次的 Radius 模型，再后台刷新。

## 导出什么

`radiusProvider(options?): Provider<"pi-messages">`。

options：`id`（默认 `"radius"`）、`name`（默认 `"Radius"`）、`gateway`（默认 `DEFAULT_RADIUS_GATEWAY`，经 `normalizeRadiusGatewayUrl`）。自建网关可以 `radiusProvider({ id: "radius-corp", gateway: "https://radius.internal" })` 再 `setProvider`，不必改 all.ts。

## 如何鉴权 / baseUrl

```ts
auth: {
  apiKey: envApiKeyAuth("Radius API key", ["RADIUS_API_KEY"]),
  oauth: lazyOAuth({ name, load: () => loadRadiusOAuth({ name, gateway }) }),
}
```

key 或 OAuth 二选一。refresh 时：oauth 用 `credential.access`，否则 `credential.key`，传给 `loadRadiusGatewayConfig` 当 Bearer。

厂家对象无 `baseUrl`。每条模型的 baseUrl 来自网关 config。`applyAuth` 仍可按通用规则覆盖。

`KnownProvider` 含 `"radius"`，`BuiltinProvider`（`keyof typeof MODELS`）不含。

## 和 all.ts 的关系

`builtinProviders()` **包含** `radiusProvider()`。`getBuiltinModel` / `MODELS` **不含**。`getBuiltinProviders()` 返回静态键，没有 radius。

compat 全局 `builtinModels()` 会 `setProvider` Radius，启动后 `refresh` 才有模型。未 refresh 时 `getModels("radius")` 为空。

## 逐步精读

手写 Provider 仍必须提供 `auth`（注释：即使本地无钥匙的厂家也要有 resolve 语义）。`getModels: () => models` 不 throw。

`refreshModels` 的 `publish` 与 `createProvider` 内部实现同构：先 `update` 恢复，再联网后 `persist + update`。`publish` 返回 false 表示 generation 过期（厂家被换掉或新的 refresh 已开始），立即 return。

遗留分支：`!stored && credential.type === "oauth"` 时从 token 对象上的 `gatewayConfig` 拿出模型写入新 store。只跑一次迁移。

`stream` 直接调 `piMessagesApi()` 的 streams，没有按 api map——本厂模型全是 `pi-messages`。

## 失败与边界

- 网关挂了：`loadRadiusGatewayConfig` throw，`Models.refresh` 记入 `errors` map，**保留**闭包里上一份 models（createProvider 文档也是这个语义）。
- `allowNetwork: false`：只恢复，不 fetch。离线启动能用缓存目录。
- 与 `createProvider({ fetchModels })` 的差异：Radius 多了遗留 OAuth 导入；没有 baseline 静态表。新厂家优先用 `createProvider` + `fetchModels`，除非有同样的迁移包袱。
- `id` 可定制，但 OAuth 凭证按 provider id 分槽。两个 Radius 网关要用两个 id。

## 下一课

配置校验：[radius-config.ts](/series/pi-source/ai/209-radius-config-ts/)。静态厂家对照：[openai.ts](/series/pi-source/ai/194-openai-ts/)。
