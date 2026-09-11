---
title: "02 · errors.ts — 可以过协议边界的错误"
summary: "只有这些 code 会原样到达客户端 ServerError.code。其它 throw 变成 internalerror + 固定文案 \"Internal server error\"，避免栈和路径泄漏。"
tags: [pi, server]
---
源码：`packages/server/src/errors.ts`  
核心导出：`ServerError` 及其子类、`INTERNAL_SERVER_ERROR_MESSAGE`  
被谁调用：`SessionRouter` 抛 `ServerDrainingError` / `SessionNotAttachedError`；host 的 `resolveSession` 抛 `SessionNotFoundError` / `SessionAmbiguousError`；`Server.toProtocolError` 把它们编进 response。

## 本课目标

只有这些 code 会原样到达客户端 `ServerError.code`。其它 throw 变成 `internal_error` + 固定文案 `"Internal server error"`，避免栈和路径泄漏。

## 码表

| 类 | code | 何时 |
|---|---|---|
| `WrongServerError` | `wrong_server` | request.target.serverId 对不上本进程 |
| `SessionNotFoundError` | `session_not_found` | resolve 找不到 |
| `SessionAmbiguousError` | `session_ambiguous` | 同一 id 多条元数据（共享容器脏了，或 list 过滤错） |
| `SessionNotAttachedError` | `session_not_attached` | Session 调用但本连接没 attach，或 attachmentId 过期 |
| `ServerDrainingError` | `server_draining` | `Server.close` 已开始，或连接已标记 disconnected 仍 attach |

基类还允许 chord 的 `RemoteServiceErrorCode` 联合。应用服务抛 `RemoteServiceError` 时 `toProtocolError` 同样透传 code/message。

`WrongServerError` 的 message 是固定英文 `"Request was addressed to another server"`。客户端连错逻辑 id 时，握手阶段其实更早就会因 hello.serverId 不匹配在**客户端**失败；这条码防的是握手后 target 填了别人的 serverId。

## `INTERNAL_SERVER_ERROR_MESSAGE`

`toProtocolError` 遇到既不是 `ServerError` 也不是 `RemoteServiceError` 也不是 `ProtocolValidationError` 的值：先 `reportError`（给 `onError` 钩子看真异常），再回这条固定 message。`ProtocolValidationError` 变成 `invalid_request` + 原 message（帧/调用形状问题，可以告诉客户端）。

## 失败与边界

- 取消：`AbortController` abort 后 `handleRequest` 回 `cancelled`，不是本文件的类。
- 不要把 `Error("unknown session")` 随便 throw。必须用 `SessionNotFoundError`，否则客户端只看到 internal_error。
- client 包的 `ServerError` 是另一回事：它是收到 `{ ok: false }` 后的本地包装。code 字符串应对得上本表。

## 下一课

传输如何把已授权连接交进来：[03-listener.ts.md](/series/pi-source/server/401-listener-ts/)。
