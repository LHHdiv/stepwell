---
title: "04 · transport.ts — 字节传输的最小接口"
summary: "Client 不 import node:net。换 WebSocket、换 Radius，只要满足这三件事：保序 send、恰好一次终端回调、每次 factory 调用是新连接。"
tags: [pi, client]
---
源码：`packages/client/src/transport.ts`（19 行）  
核心导出：`ByteTransport`、`ByteTransportHandlers`、`ByteTransportFactory`  
被谁调用：`Connection` 只依赖这些类型；`unix.ts` 实现它们。

## 本课目标

Client 不 import `node:net`。换 WebSocket、换 Radius，只要满足这三件事：保序 `send`、恰好一次终端回调、每次 factory 调用是新连接。

## `ByteTransport`

```ts
send(chunk: Uint8Array): Promise<void>;
close(): void;
```

`send` 必须按调用顺序交付，并尊重背压（Promise 在内核缓冲区吞下后再 resolve）。Unix 实现用 write 链 + `maxPendingBytes`。

`close` 必须幂等。Connection 在失败路径会 `transport?.close()`，socket 的 `close` 事件又可能再进 `#handleClose`——实现侧反复 close 不能 throw。

## `ByteTransportHandlers`

factory 的入参，由 Connection 提供：

- `onData(chunk)`：任意切片，Decoder 自己拼帧
- `onClose()`：有序终端关闭（FIN / destroy 后的 close）
- `onError(error)`：终端失败

注释：**恰好一个**终端 handler。Unix 实现用 `terminal` 标志，保证 `onClose` 和 `onError` 不会都报给已 connected 的 Connection。未连上就失败则 `reject` factory 的 Promise，不调 handler。

## `ByteTransportFactory`

```ts
(handlers) => ByteTransport | Promise<ByteTransport>
```

每次 `connect()` 调一次。不能复用上一条已关闭的 socket。认证（若有）在 factory 内部完成，Client 假定拿到的 transport 已经可以发 hello。实验 Unix 传输**没有**应用层认证，靠 socket 目录权限。

## 失败与边界

- `onData` 必须同步把 chunk 交给 Connection。Connection `#handleData` 同步 `decoder.push`。若 transport 在别的 tick 乱序拼 chunk，帧会坏。
- factory throw / reject → Connection `#fail(DisconnectedError)`，handshake reject。这发生在 connecting，不会误伤上一次连接（每次 connect 有递增 `id`）。

## 下一课

把 factory 和 decoder 焊成状态机：[05-connection.ts.md](/series/pi-source/client/394-connection-ts/)。
