---
title: "cloudflare-stream.ts — 发请求前把 URL 占位符换成账户/网关"
summary: "json 里的 baseUrl 长这样："
tags: [pi, ai]
---
源码：`packages/ai/src/providers/cloudflare-stream.ts`  
核心导出：`resolveCloudflareModel`、`cloudflareStreams`  
被谁调用：两家 Cloudflare 工厂在把 lazy api 塞进 `createProvider` **之前**包一层。

## 本课目标

json 里的 baseUrl 长这样：

```text
https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1
https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/compat
```

占位符名与环境变量名相同，含花括号。协议实现不知道 Cloudflare。本文件在 `stream`/`streamSimple` 入口把 `model` 换成 baseUrl 已替换的新对象，再交给真正的 `openai-completions` / `anthropic-messages` / `openai-responses`。

这是第 1 层对第 2 层的 **包装**，不是第四种协议。

## 这个文件在系统中的位置

```text
Models.applyAuth
  把 resolve 得到的 env 放进 stream options.env
provider.streamSimple(model, context, options)
  createProvider 调到的是 cloudflareStreams(inner)
    resolveCloudflareModel(model, options.env)
    inner.streamSimple(newModel, ...)
```

常量字符串与 `src/api/cloudflare.ts` 里生成脚本用的 URL 模板一致。改占位符名要三处一起改：生成脚本、本文件、auth 的 env 键。

## 导出什么

`resolveCloudflareModel(model, env)`：没有 env 原样返回。有则对 `model.baseUrl` 做 `replaceAll(\`{CLOUDFLARE_ACCOUNT_ID}\`, env[...] ?? 原占位符)`，gateway 同理。替换后 URL 没变则返回原 model（引用相等，避免无谓复制）。变了则 `{ ...model, baseUrl }`。

`cloudflareStreams(streams): ProviderStreams`：只包 `stream` 和 `streamSimple`。Cloudflare 内建模型不做 deferred，所以没有 `fetchDeferred`。

## 如何鉴权 / baseUrl

本文件不读环境变量、不碰 key。它假设 `options.env` 已经被 `applyAuth` 填好——那是 [cloudflare-auth.ts](/series/pi-source/ai/157-cloudflare-auth-ts/) 的产物。

若 env 缺字段，占位符留在 URL 里，HTTP 会 404/401。正常路径上 auth resolve 失败会更早挡住。本包装是「已配置前提下的 URL 物化」。

## 和 all.ts 的关系

`all.ts` 不 import 本文件。两家工厂 import。`getBuiltinModel("cloudflare-workers-ai", "@cf/...")` 返回的模型 **仍带花括号 URL**——静态目录不知道你的 account。只有走 `Models.stream*` 才会替换。UI 展示端点时要意识到这一点。

## 逐步精读

`replaceAll` 用完整 `{CLOUDFLARE_ACCOUNT_ID}` 作搜索串，不会误伤路径其它片段。account id 本身若含花括号（不会）才是问题。

Gateway 三条路径（anthropic / compat / openai）都含两个占位符，一次 `resolveCloudflareModel` 全部替换，因为都在同一条 `baseUrl` 字符串上。

包装后的 streams 仍是同一 `ProviderStreams` 形状，`createProvider` 不关心内层是 lazy api 还是再包了 Cloudflare。

## 失败与边界

- `env[CLOUDFLARE_ACCOUNT_ID]` 是空字符串：`??` 不会 fallback（空串非 nullish），URL 变成 `/accounts//ai/v1`。auth 层应保证缺省是 `undefined` 而不是 `""`。
- 不要在协议文件里再 replace 一次，避免双替换或读 process.env。
- 自定义模型若忘了写占位符、写死了别人的 account，本函数不动它（没有花括号则 URL 不变）。

## 下一课

工厂：[cloudflare-workers-ai.ts](/series/pi-source/ai/160-cloudflare-workers-ai-ts/)、[cloudflare-ai-gateway.ts](/series/pi-source/ai/156-cloudflare-ai-gateway-ts/)。常量来源：`src/api/cloudflare.ts`（生成脚本 import，不在本课目录）。
