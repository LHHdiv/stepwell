---
title: "45 · auth/helpers.ts — `envApiKeyAuth` 与 `lazyOAuth`"
summary: "标准 API key 厂家。login：secret prompt，存 { type: \"apikey\", key }。 resolve：存储的 credential.key 优先，否则按顺序 ctx.env(var)，第一个非空。so"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/helpers.ts`  
被谁调用：几乎每个厂家工厂的 `auth` 字段。

## `envApiKeyAuth(name, envVars)`

标准 API key 厂家。`login`：secret prompt，存 `{ type: "api_key", key }`。  
`resolve`：存储的 `credential.key` 优先，否则按顺序 `ctx.env(var)`，第一个非空。source 分别是 `"stored credential"` 或变量名。都没有 → undefined。

没有 `check`：`Models.checkAuth` 会跑完整 resolve（只读 env，无副作用，OK）。

## `lazyOAuth({ name, load, isSubscription, loginLabel })`

`login`/`refresh`/`toAuth` 第一次才 `load()`。之后缓存 Promise。厂家文件顶部写：

```ts
oauth: lazyOAuth({ name: "...", load: loadAnthropicOAuth })
```

`loadAnthropicOAuth` 内部再动态 import Node-only 流程。浏览器 bundle 不含 `node:http` 回调服务器。

## 失败与边界

`load()` reject：三个方法都会把同一 reject 抛给调用方。没有重试加载。env 变量顺序即优先级（anthropic 工厂不应用本 helper 处理 AUTH_TOKEN，那条要走自定义 resolve）。

## 下一课

请求路径真正取凭证：[46-auth-resolve.ts.md](/series/pi-source/ai/107-auth-resolve-ts/)。
