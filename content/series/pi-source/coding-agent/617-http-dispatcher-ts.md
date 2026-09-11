---
title: "81 · http-dispatcher.ts — 全局 fetch 的 idle 超时和代理"
summary: "pi-ai 用全局 fetch。Undici 默认 headers/body idle 可能让长流式被掐。本文件安装 EnvHttpProxyAgent：headersTimeout/bodyTimeout = 设置值，默认 300s，"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/http-dispatcher.ts`  
被谁调用：`main` 启动时 `configureHttpDispatcher(settings.getHttpIdleTimeoutMs())`、`applyHttpProxySettings`。

## 本课目标

pi-ai 用全局 `fetch`。Undici 默认 headers/body idle 可能让长流式被掐。本文件安装 `EnvHttpProxyAgent`：`headersTimeout`/`bodyTimeout` = 设置值，默认 300s，`0` 表示 disabled。Happy Eyeballs 尝试超时 2s（Node 默认 250ms 在高延迟路由太狠）。

`undici.install()` 让 `fetch` 和 dispatcher 来自同一份 undici，避免 Node 26 压缩响应解不开。若启动后调用方已经替换了 `globalThis.fetch`，不再覆盖。

Dispatcher 上挂 error listener：中流取消时 Undici 可能 emit 未处理 `error` 弄崩进程，body 的 reject 已经够用。

`parseHttpIdleTimeoutMs` 认数字和 `"disabled"`。`HTTP_IDLE_TIMEOUT_CHOICES` 给设置 UI。

代理：只 `process.env.HTTP_PROXY ??= setting`，不覆盖用户已有环境变量。

## 失败与边界

非法 timeout throw。这影响进程内所有 fetch，包括扩展。sdk 里 idle 0 还会被改成 2147483647 传给 stream 选项（09 课），与 dispatcher 的 0=disabled 是两层。

## 下一课

[82-package-manager.ts.md](/series/pi-source/coding-agent/619-package-manager-ts/)。
