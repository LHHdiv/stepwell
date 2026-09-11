---
title: "04 · connection.ts — 连接状态袋"
summary: "这不是 client 那种状态机类。服务端把每条连接的可变字段塞进一个接口对象，由 Server 的方法改 stage。读完应能说出五个 stage 各自允许什么消息。"
tags: [pi, server]
---
源码：`packages/server/src/connection.ts`  
核心导出：`ByteConnection`、`ConnectionState`、`isTerminalConnection`  
被谁调用：`Server.accept` 创建 `ConnectionState`；Unix `UnixByteConnection` 实现 `ByteConnection`。

## 本课目标

这不是 client 那种状态机类。服务端把每条连接的可变字段塞进一个接口对象，由 `Server` 的方法改 `stage`。读完应能说出五个 stage 各自允许什么消息。

## `ByteConnection`

```ts
readonly closed: boolean;
send(chunk: Uint8Array): Promise<void>;
close(finalChunk?: Uint8Array): MaybePromise<void>;
```

`finalChunk` 给握手失败用：先把 `hello_error` 帧写出去再关。Unix 实现等 writeTail 排空再 `socket.end(finalBytes)`，带 graceful timeout。

## `ConnectionStage`

| stage | 含义 |
|---|---|
| `awaitingHello` | 刚 accept，第一帧必须是 client hello |
| `handshaking` | 正在 `attachClient`、发 server hello |
| `ready` | 可接受 request/cancel |
| `closing` | 正在关，忽略新数据 |
| `closed` | 完 |

`isTerminalConnection`：`disconnected || closing || closed`。`receive` 开头就 return。`disconnected` 是逻辑标志，比 socket `closed` 更早：协议失败后先标上，避免重入。

## `ConnectionState` 字段

- `decoder`：`ClientMessageDecoder`，这条连接专用
- `serviceStateEncoders`：`subscriptionId → ServiceStateEncoder`。subscribe 成功才 set，unsubscribe 删除。推 update 时找不到 encoder 就静默 return（订阅已拆）
- `handshake?: Promise<void>`：handshaking 期间到达的 request 挂到这份 Promise 后面，hello 完成再处理。避免「hello 还在 attachClient，客户端已经发 attach」丢消息
- `handshakeTimeout`：默认 5s，`unref`。超时 `failProtocol(invalid_request, Handshake timeout)`
- `serverServices?`：handshake 成功后的连接级附件
- `activeRequests`：`id → { controller, target }`。重复 id 拒绝；cancel 按 id+target 对上才 abort

`client` 在 SessionRouter 里用这个对象当 Map 的 key（`attachmentsByClient: Map<object, ...>`）。身份是引用相等，不是 socket fd。

## 失败与边界

- 没有把 `ByteConnection` 和 `ConnectionState` 合成一类，是为了测试可以塞假连接。
- `handshakeTimeout` 类型是 `NodeJS.Timeout`。本包测试在 Node 跑；unix listener 也是 Node。根 `Server` 因此不是浏览器包。

## 下一课

附件和 Session 打开的串行化：[05-session-router.ts.md](/series/pi-source/server/403-session-router-ts/)。
