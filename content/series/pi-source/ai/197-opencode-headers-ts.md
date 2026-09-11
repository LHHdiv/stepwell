---
title: "opencode-headers.ts — 给 OpenCode 网关补 x-opencode-session"
summary: "OpenCode Zen/Go 要求每个对话带 x-opencode-session，用来把请求钉到同一条后端会话（缓存、路由、计费）。Agent 侧已有 sessionId（来自 SessionManager，见 coding-age"
tags: [pi, ai]
---
源码：`packages/ai/src/providers/opencode-headers.ts`  
核心导出：`withOpenCodeSessionHeader`  
被谁调用：[opencode.ts](/series/pi-source/ai/199-opencode-ts/)、[opencode-go.ts](/series/pi-source/ai/196-opencode-go-ts/) 在每份协议 streams 外包一层。

## 本课目标

OpenCode Zen/Go 要求每个对话带 `x-opencode-session`，用来把请求钉到同一条后端会话（缓存、路由、计费）。Agent 侧已有 `sessionId`（来自 SessionManager，见 coding-agent sdk 课）。本文件在协议 dispatch **之前** 把 `options.sessionId` 写成头，协议实现不用知道 OpenCode。

这又是第 1 层包装第 2 层，和 Cloudflare 的 URL 替换同类。

## 这个文件在系统中的位置

```text
sdk streamFn 传入 sessionId
  Models.streamSimple(..., { sessionId, headers })
    provider.streamSimple
      withOpenCodeSessionHeader(inner).streamSimple
        withSessionHeader(options)  // 可能给 headers 加上 x-opencode-session
        inner.streamSimple          // anthropic-messages / openai-* / google-generative-ai
```

## 导出什么

`withOpenCodeSessionHeader(streams: ProviderStreams): ProviderStreams`。展开原 streams（保留 `fetchDeferred` 等若存在），覆盖 `stream`/`streamSimple`。

内部 `hasHeader` 大小写不敏感：已有 `X-OpenCode-Session` 则不加。`withSessionHeader`：没有 `sessionId` 或已有头则原样返回 options（引用相等）。

常量 `OPENCODE_SESSION_HEADER = "x-opencode-session"`。

## 如何鉴权 / baseUrl

无。钥匙仍是 `OPENCODE_API_KEY`。baseUrl 在模型 json（`https://opencode.ai/zen` 与 `/zen/v1` 等）。本文件只动 headers。

## 和 all.ts 的关系

间接。两家 OpenCode 工厂被 `builtinProviders()` 登记，它们的 `api` map 的每一份都是 `withOpenCodeSessionHeader(xxxApi())`。`getBuiltinModel` 返回的模型没有这个头——头是请求期的。

## 逐步精读

Zen 有四份协议、Go 有三份，每份都要包，所以抽文件而不是在工厂里复制 7 次。

`sessionId` 来自 `SimpleStreamOptions` / `StreamOptions`，产品层保证同一会话稳定。OpenCode 用它做 prompt cache 亲和。没有 sessionId（脚本随手 `streamSimple`）就不带头，网关按无会话处理。

扩展的 `transformHeaders` 在 `Models.applyAuth` 里、**进入 provider 之前**跑完。本包装在 provider 内部、协议之前。若 transform 已经写了同名头，`hasHeader` 尊重它。

## 失败与边界

- 头值就是原始 `sessionId` 字符串，不做 URL encode。SessionManager 的 id 应是 ASCII 安全的。
- 本包装不包 `fetchDeferred`：当前 OpenCode 内建模型未声明 deferred。若将来要，需要同样套 `withSessionHeader`。
- 其它厂家不要误用这个包装——头名是 OpenCode 私有契约。

## 下一课

[opencode.ts](/series/pi-source/ai/199-opencode-ts/)、[opencode-go.ts](/series/pi-source/ai/196-opencode-go-ts/)。
