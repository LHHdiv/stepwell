---
title: "cloudflare-auth.ts — 两把 Cloudflare 钥匙的字段合并"
summary: "Cloudflare 不是「一个环境变量当 Bearer」。Workers AI 要 API key + account id；AI Gateway 还要 gateway id。本文件把 login 提示和 resolve 的「cred"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/cloudflare-auth.ts`  
核心导出：`cloudflareWorkersAIAuth`、`cloudflareAIGatewayAuth`  
被谁调用：[cloudflare-workers-ai.ts](/series/pi-source/ai/160-cloudflare-workers-ai-ts/)、[cloudflare-ai-gateway.ts](/series/pi-source/ai/156-cloudflare-ai-gateway-ts/)。`all.ts` 不直接 import。

## 本课目标

Cloudflare 不是「一个环境变量当 Bearer」。Workers AI 要 **API key + account id**；AI Gateway 还要 **gateway id**。本文件把 login 提示和 resolve 的「credential 与环境按字段合并」写在一处，两家工厂只选不同的 `kind`。

读完应能指出：为什么只存了 key 的 credential 仍能从环境里补上 account id，以及 Gateway 为什么要把 `Authorization`/`x-api-key` 设成 `null`。

## 这个文件在系统中的位置

```text
createProvider({ auth: { apiKey: cloudflareWorkersAIAuth() } })
  Models.getAuth
    auth.apiKey.resolve({ ctx, credential, signal })
      resolveCloudflareEnv("workers-ai" | "ai-gateway")
        → { apiKey, env: { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_GATEWAY_ID? }, source }
```

这是第 1 层（厂家鉴权），不是协议。协议仍是 `openai-completions` 等。account id 进 URL 是 [cloudflare-stream.ts](/series/pi-source/ai/158-cloudflare-stream-ts/) 的事：它读 `options.env` 替换 `{CLOUDFLARE_ACCOUNT_ID}`。

## 导出什么

两个 `(): ApiKeyAuth` 工厂。没有 `Provider`。没有模型表。

内部：

- `resolveValue(name, ctx, credential, signal)`：单字段。`CLOUDFLARE_API_KEY` 对应 `credential.key`，其它名对应 `credential.env[name]`；没有则 `ctx.env(name)`。
- `resolveCloudflareEnv(kind, ...)`：key、account 必有；`kind === "ai-gateway"` 时 gateway 必有。缺任一返回 `undefined`（未配置）。

## 如何鉴权 / baseUrl

本文件不设 baseUrl。URL 在 json 模型上。

### Workers AI

login：secret key + text account id → `{ type: "api_key", key, env: { CLOUDFLARE_ACCOUNT_ID } }`。

resolve：配齐后 `{ auth: { apiKey }, env, source }`。协议层按惯例把 apiKey 写成 `Authorization: Bearer`（OpenAI 兼容口）。source 在有 credential 时是 `"stored credential"`，否则 `"CLOUDFLARE_API_KEY"`。

### AI Gateway

login 多问一个 Gateway ID，写进 `credential.env.CLOUDFLARE_GATEWAY_ID`。

resolve 的 `auth` **不是** `apiKey` 字段：

```ts
headers: {
  "cf-aig-authorization": `Bearer ${resolved.apiKey}`,
  Authorization: null,
  "x-api-key": null,
}
```

Gateway 要自己的头。`null` 在 header 合并语义里是「删掉这个头」，防止 completions/messages 实现再塞标准 Bearer/`x-api-key` 把网关搞乱。这是厂家鉴权对协议默认头的覆盖，协议文件保持通用。

## 和 all.ts 的关系

间接：两家 `*Provider()` 被 `builtinProviders()` 登记，它们的 `auth.apiKey` 指向这里返回的对象。`getBuiltinModel` 不跑 resolve。

## 逐步精读

「Per-field merge」注释是核心：用户可能 login 时只贴了 key，account/gateway 留在 shell env；也可能反过来。`resolveValue` 按字段独立 fallback，不是「有 credential 就整份只用 credential」。

`kind` 用联合类型而不是布尔，避免 Workers AI 误要 gateway。`ProviderEnv` 只放非密钥的 account/gateway，key 走 `auth.apiKey` 或 Gateway 的专用头。

abort：每个 `ctx.env` 前后 `signal.throwIfAborted()`，登录过程可取消。

## 失败与边界

- 只配了 `CLOUDFLARE_API_KEY`：Workers AI / Gateway 都未配置（缺 account）。`checkAuth` 失败，stream 不会带着占位符 URL 打出去。
- Gateway 用户若靠协议默认 Bearer：会被 `Authorization: null` 清掉，只留 `cf-aig-authorization`。
- 两家 provider id 不同，auth.json 两个槽。account id 相同也要存两份（或一边靠 env）。
- 不要在协议里再读 `process.env.CLOUDFLARE_ACCOUNT_ID`——权威是 resolve 写出的 `options.env`，测试才能注入。

## 下一课

占位符替换：[cloudflare-stream.ts](/series/pi-source/ai/158-cloudflare-stream-ts/)。两家工厂：[cloudflare-workers-ai.ts](/series/pi-source/ai/160-cloudflare-workers-ai-ts/)、[cloudflare-ai-gateway.ts](/series/pi-source/ai/156-cloudflare-ai-gateway-ts/)。
