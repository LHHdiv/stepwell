---
title: "43 · runtime-credentials.ts — 不写盘的 API key"
summary: "CredentialStore 多一个 Map overlay。read 命中 overlay 则返回 { type: \"apikey\", key }，不看 auth.json。modify 仍打到底层（登录 OAuth 要写盘）。de"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/runtime-credentials.ts`  
被谁调用：`ModelRuntime` 内部包住 AuthStorage；CLI `--api-key`。

## 本课目标

`CredentialStore` 多一个 Map overlay。`read` 命中 overlay 则返回 `{ type: "api_key", key }`，不看 auth.json。`modify` 仍打到底层（登录 OAuth 要写盘）。`delete` 底层和 overlay 都清。

`list`：底层 ∪ overlay 的 providerId。overlay 把该 id 显示成 api_key，即使磁盘上是 oauth。

## 失败与边界

overlay 不进 auth.json，进程结束即无。`hasRuntimeApiKey` 给 UI 区分「这次启动传入」和「已登录」。`signal.throwIfAborted` 在 read/list/delete 入口。

## 下一课

[44-auth-storage.ts.md](/series/pi-source/coding-agent/542-auth-storage-ts/)：`auth.json` 的锁与权限。
