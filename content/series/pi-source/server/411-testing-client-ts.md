---
title: "13 · testing/client.ts — 打裸帧的 ProtocolTestClient"
summary: "测 framing 粘包、hello 乱序、错误码时，要用能 sendFragmented 的客户端。pi-client 故意不暴露半帧。本文件自己持 ServerMessageDecoder，把收到的每条消息推进数组，next(pre"
tags: [pi, server]
---
源码：`packages/server/src/testing/client.ts`  
核心导出：`ProtocolTestClient`、`connectUnixTestClient`、`WireChannel`  
被谁调用：server 的 unix / 协议测试。**不是** `pi-client` 的 Client。

## 本课目标

测 framing 粘包、hello 乱序、错误码时，要用能 `sendFragmented` 的客户端。`pi-client` 故意不暴露半帧。本文件自己持 `ServerMessageDecoder`，把收到的每条消息推进数组，`next(predicate)` 等待。

## `WireChannel`

`send` / `sendFragmented(chunk, splitAt)` / `close`。Unix 测试用真 socket；内存测试可以接一对假通道。

## `ProtocolTestClient`

- `hello(version = 8)`：先登记 waiter（type hello 或 hello_error），再发。顺序重要：否则极快的对端可能在登记前就 push 进 messages，`next` 仍能 `messages.find` 到。
- `requestService(target, call, id?)`：等对应 id 的 response
- `attach(serverId, sessionId)`：服务器级 `pi.session-management.attach`
- `requestSessionService`：若已从 attachment 消息记下三元组且 sessionId 相符，用真 attachmentId；否则用 `"missing-attachment"` 方便测 SessionNotAttached
- `receive`：decoder.push；attachment 消息更新本地 `this.attachment`；唤醒 waiter
- `markClosed`：resolve `waitForClose`，所有 waiter reject `"Wire connection closed"`
- decode 失败 `fail`，waiter 全 reject

`nextFrom(index, predicate)` 允许跳过已经匹配过的旧消息，测「第二条 response」。

## `connectUnixTestClient`

`createConnection` + `once(connect)`，data 转 Uint8Array 进 `receive`。`sendFragmented` 两次 write。close 是 destroy 等 close 事件。没有 pending 上限、没有 hello 自动发送——测试自己 `await client.hello()`。

## 失败与边界

- 没有 request 超时。测试自己 `Promise.race`。
- 不解析 Chord snapshot。response.result 原样给断言。
- 和产品 Client 行为差异：产品会在畸形帧时拆连接；本 client 只 fail waiter，socket 怎么关看测试。

## 下一课

确定性 serverId 的工厂：[14-testing.server.ts.md](/series/pi-source/server/412-testing-server-ts/)。
