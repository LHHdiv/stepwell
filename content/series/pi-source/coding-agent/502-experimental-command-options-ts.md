---
title: "24 · command-options.ts — 实验命令共享的地址和认证"
summary: "实验 client 要连已有 server。地址只认两种 URL：unix:///绝对路径 和 radius://<uuid>。认证是 token 字符串或文件路径，二者互斥。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/experimental/command-options.ts`  
被谁调用：`commands/client.ts`、`commands/server.ts`。

## 本课目标

实验 client 要连已有 server。地址只认两种 URL：`unix:///绝对路径` 和 `radius://<uuid>`。认证是 token 字符串或文件路径，二者互斥。

## 认证

`AuthInput`：`{ type: "token", token }` 或 `{ type: "file", path }`。  
`parseAuth` 读 `--auth-token` / `--auth-token-file`。两个都给 → 错误。都不给 → 没有 auth 字段（后续运行时可能用默认）。

本文件不读文件内容，只记下 path。

## `--connect`

`parseTransportAddress`：

**radius:**

- hostname 必须是 lowercase UUIDv4（`isServerId`）
- 禁止 userinfo、port、query、hash；pathname 只能空或 `/`
- 原始字符串必须等于 `radius://${hostname}${pathname}`，防 URL 规范化偷改

**unix:**

- 必须 `unix:///` 开头（三个斜杠 = 绝对路径）
- 禁止 `unix:////`、authority、query、hash
- pathname `decodeURIComponent`，禁止 `\0`，必须 posix 绝对路径

其它 scheme → unsupported transport。

## `unsupportedOptions`

remainingArgs 非空时返回一句：「experimental X command does not support existing CLI options yet」。client 在确认 remaining 是合法 prompt 之后才调用它。

## 失败与边界

unix 路径用 `posix.isAbsolute`，在 Windows 上 `unix:///C:/...` 的判定按 POSIX，不是 win32。radius 的 serverId 只在 hostname，不能写成 path。

## 下一课

[25-experimental-client.ts.md](/series/pi-source/coding-agent/504-experimental-client-ts/)：`experimental client` 的合法组合。
