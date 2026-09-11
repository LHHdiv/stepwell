---
title: "02 · errors.ts — 客户端能看到的三种失败"
summary: "分清「对端用协议错误码拒绝」和「本地连接没了」。应用 catch 时按 error.name / instanceof 分支，不要把所有 Error 当断线重连。"
tags: [pi, client]
---
源码：`packages/client/src/errors.ts`  
核心导出：`ServerError`、`DisconnectedError`、`ClientDisposedError`  
被谁调用：`connection.ts` 在握手/传输失败时；`client.ts` 在 response.ok === false、dispose、未连接时 request。

## 本课目标

分清「对端用协议错误码拒绝」和「本地连接没了」。应用 catch 时按 `error.name` / `instanceof` 分支，不要把所有 Error 当断线重连。

## `ServerError`

```ts
constructor(error: ProtocolError) {
  super(error.message);
  this.name = "ServerError";
  this.code = error.code;
}
```

`code` 来自对端：握手阶段常见 `"version"`；业务阶段是 chord 的 `RemoteServiceErrorCode` 或 server 的 `wrong_server` / `session_not_found` / `session_not_attached` / `server_draining` / `cancelled` / `invalid_request` / `internal_error`。

unix discovery 把 `code === "version"` 当「这不是能说话的对端，跳过」，和 `ProtocolValidationError` 同类处理。

注意：server 包也有一个 `ServerError`。那是**服务端**抛给协议层的。两边同名不同包。实验 coding-agent 用别名 `ServerError as ClientServerError`。

## `DisconnectedError`

默认消息 `"Client is disconnected"`。可选 `cause`。`toDisconnectedError`：已经是 DisconnectedError 就原样返回，否则包一层并挂 cause。Connection 把 transport 的任意 throw 都收成这个类型，避免 socket 的 `EPIPE` 直接冒到 `Client.request` 的调用方——调用方统一 catch DisconnectedError。

握手期间对端关连接：`Byte transport closed`。主动 `disconnect("Client disconnected")` 用默认或传入字符串。

## `ClientDisposedError`

`dispose()` 之后一切 API reject/throw 这个。没有 cause。和 DisconnectedError 分开，是因为 dispose 是调用方意愿，重连没有意义；断线才 `reconnect()`。

## `toError`

非 Error 的 throw 值变成 `new Error(String(error))`。listener 钩子和 transport error 入口用。注意 telemetry 契约要求保留同一引用；**本包不走那条契约**，这里可以包。

## 失败与边界

- `ServerError` 不是 `DisconnectedError`。对端回 `ok: false` 时连接仍在，可以发下一个 request。
- 协议畸形（错帧、hello 不是第一帧、response 没有匹配的 id）走 `ProtocolValidationError`（protocol 包），Connection `#failAndClose`。那会变成一次带 cause 或不带 cause 的断开，pending request 全部 reject。
- 不要比较 `error.message` 做逻辑。比较 `instanceof` 和 `code`。

## 下一课

一个 16 行的 Promise 工具：[03-promise.ts.md](/series/pi-source/client/392-promise-ts/)。
