---
title: "06 · server.ts — 握手、request 循环、关闭"
summary: "对照 client 的 Connection + Client 读。服务端一条连接的数据路径全在本文件；Session 打开在 router。读完应能指出 hello 超时、重复 request id、订阅 snapshot 与 upd"
tags: [pi, server]
---
源码：`packages/server/src/server.ts`  
核心导出：`Server`  
被谁调用：`createUnixServer`；testing `createTestServer`；实验 `startForegroundServer`。

## 本课目标

对照 client 的 `Connection` + `Client` 读。服务端一条连接的数据路径全在本文件；Session 打开在 router。读完应能指出 hello 超时、重复 request id、订阅 snapshot 与 update 的时序、未知异常如何变成 `internal_error`。

## 在系统中的位置

```text
server.start()
  listener.start(connection => server.accept(connection))
accept
  new ConnectionState(stage: awaitingHello)
  return { onData: receive, onClose: transportClosed, onError }
receive → decoder.push → dispatchMessage
```

closing 中的 accept：立刻 `closeConnection`，handler 是空 onData。新客户端连上就死，不会卡在握手。

## 握手

第一帧不是 hello → `hello_error` invalid_request。hello 之后 `stage = handshaking`，`finishHandshake`：

1. 版本不是 8 → `hello_error` code `version`，文案带 expected 8
2. `host.serverServices.attachClient(presentation)`，presentation 的三个方法转给 router
3. 若期间已经 closing/disconnected，`services.release`，不发 hello
4. `sendMessage(server hello)` 成功才 `stage = ready` 并清 timeout

handshaking 期间到达的 request/cancel 挂在 `state.handshake.then(...)`。ready 之后直接 handle。再发 hello → 协议失败关连接。

`failProtocol`：stage=closing，尝试编码 `hello_error` 当 `finalChunk` 交给 `connection.close`。编码失败只 reportError，仍然关。

## `handleRequest`

1. 重复 id → 回 `ok: false invalid_request`，**不断开**
2. `parseServiceCall` 失败 → 同样回 invalid_request
3. 登记 AbortController；context = `withAbortSignal(..., TODO_CONTEXT)`
4. `decodeServiceControlCall`：若是 subscribe，记下 subscriptionId，`subscriptionReady=false`，publish 在 ready 前把 update 缓冲到 `pendingUpdates`
5. target.serverId 不对 → `WrongServerError`
6. 重复 subscriptionId → ProtocolValidationError（会回 invalid_request 并……走 catch 的 sendMessage ok:false，不断开，除非已经 responded）
7. 有 sessionId → `sessions.executeServiceCall`；否则 `state.serverServices.invokeService`
8. subscribe：必须有 result；`createServiceStateEncoder().encodeSnapshot`；登记 encoder
9. unsubscribe：删 encoder
10. 发 `ok: true` response；然后把 pendingUpdates 按序 `sendServiceUpdate`；`subscriptionReady=true`

catch：若已经 `responded`（response 发出后 flush update 失败），reportError **并断开**——半截订阅流不可恢复。若未 responded：abort 则 `cancelled`，否则 `toProtocolError`。subscribe 已安装 encoder 但没 responded 则删掉 encoder。

`sendServiceUpdate`：没有 encoder 就 return（unsubscribe 竞态）。有则 `encodeUpdate` 后发 `service_update`。

## cancel

`target.serverId` 不对直接忽略（不回包，cancel 无 response）。id 对上且 `sameTarget` 才 `controller.abort(AbortError)`。target 三元组必须完全一致，避免取消别人的调用。

## 出站 `sendMessage`

disconnected 或 socket closed → false。编码失败或 send throw：reportError，close+disconnect，false。`publishAttachment` 走这条，所以 detach 时连接已死会安静失败。

## 关闭

`close()`：`closing=true`，关所有 listener，`closeServerState`：

- 现存连接 stage=closing，clear timeout，`closeConnection`（无 finalChunk），`disconnect`
- `sessions.close(BACKGROUND_CONTEXT)`
- 错误聚合

`disconnect`：abort 所有 activeRequests（`"Client disconnected"`，不是 AbortError DOMException）、清 encoder、删出 connections 集合、异步 `sessions.disconnect` + `serverServices.release`。失败只 reportError。

`closed` Promise：构造时创建，成功 `resolveClosed`，失败 reject。`void this.closed.catch(() => {})` 防止无人 await 时成 unhandled rejection。`start` 失败也会 settleClosed。

## `start` 互斥

已 started / 正在 start / 正在 close 都 reject。没有 restart。关干净后 `started=false`，但 `closing` 仍为 true——**不能再 start 同一实例**。launcher 要 `new Server`。

## 失败与边界

- `TODO_CONTEXT`：握手和 disconnect 的应用 context 没有来自客户端的 abort。后续会换成真实认证 context。现在等于「没有取消、没有 deadline」。
- 连接计数在 add/delete connections 时通知。钩子 throw → reportError。
- `sameTarget`：一边有 sessionId 一边没有 → false。服务器级 cancel 不能取消 Session 级 request。

## 下一课

Unix 传输从类型开始：[07-transports.unix.types.ts.md](/series/pi-source/server/405-transports-unix-types-ts/)。
