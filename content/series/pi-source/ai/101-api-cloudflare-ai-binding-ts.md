---
title: "40 · api/cloudflare-ai-binding.ts — `env.AI.fetch` 当 fetch"
summary: "Worker 调同账号的 AI Gateway 不必 Cloudflare API token：binding 的 fetch 已经带身份。HTTPS 路径（39 课）则必须 token。本文件只解决两件事：类型上 Ai 还没声明 fe"
tags: [pi, ai]
---
源码：`packages/ai/src/api/cloudflare-ai-binding.ts`  
被谁调用：跑在 Cloudflare Worker 里的嵌入方，把 `createAiBindingFetch(env.AI)` 传给 `streamSimple({ fetch, headers })`。

## 本课目标

Worker 调同账号的 AI Gateway **不必** Cloudflare API token：binding 的 `fetch` 已经带身份。HTTPS 路径（39 课）则必须 token。本文件只解决两件事：类型上 `Ai` 还没声明 `fetch`；鉴权检查要一个哨兵头。

## `createAiBindingFetch`

构造时检查 `typeof binding.fetch === "function"`，否则 TypeError（别等第一次推理才发现传了错对象）。`bind` 一下，因为 `fetch` 是可变属性，narrowing 进不了闭包。

返回的 fetch **原样**转发 method/headers/body/stream，不缓冲。模型 `baseUrl` 应已经是 binding 认识的：

`https://workers-binding.ai/ai-gateway/gateways/{gateway}/anthropic`

## 哨兵

API 实现要求 apiKey 或 `authorization` / `x-api-key` / `cf-aig-authorization`。binding 预认证，但检查仍在。调用方应：

```ts
headers: {
  "cf-aig-authorization": `Bearer ${CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL}`,
  Authorization: null,
  "x-api-key": null,
}
```

`null` 压掉 SDK 默认的 Authorization，避免网关把它当成 BYOK 覆盖已存的厂家 key。网关会剥掉 `cf-aig-authorization`。

`AiBinding` 带 `aiGatewayLogId` 是为了结构类型不要误接受普通 `{ fetch }` 对象。

## 失败与边界

binding 无 fetch：构造 throw。baseUrl 仍指向 `gateway.ai.cloudflare.com` 却用 binding fetch：请求打到错误宿主。哨兵当真正的 key 发给 HTTPS 网关会认证失败。

## 下一课

图像生成唯一实现：[41-api-openrouter-images.ts.md](/series/pi-source/ai/102-api-openrouter-images-ts/)。
