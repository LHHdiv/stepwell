---
title: "08 · index.ts — protocol 包的公共表面"
summary: "对照 export 清单，确认 client/server 该从这里拿什么、不该拿什么。schema 对象（ClientMessageSchema）没有导出——那是 codec 内部的 Check 输入。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/index.ts`  
被谁调用：所有 `@earendil-works/pi-protocol` 的 import。没有子路径 export。

## 本课目标

对照 `export` 清单，确认 client/server 该从这里拿什么、不该拿什么。schema 对象（`ClientMessageSchema`）**没有**导出——那是 codec 内部的 Check 输入。

## 导出分组

```ts
export * from "./cbor/index.ts";   // encodeCbor, decodeCbor, CborError, 默认上限
export * from "./codec.ts";        // 编解码器、ProtocolValidationError、isSupportedProtocolVersion
export * from "./framing.ts";      // encodeFrame, FrameDecoder, DEFAULT_MAX_FRAME_LENGTH, FrameError
export { PROTOCOL_VERSION, isServerId, 各消息类型 } from "./protocol.ts";
```

从 `protocol.ts` 是**具名**再导出，丢掉了 `ClientMessageSchema` / `ServerMessageSchema` / 各个内部 StrictObject。调用方不能自己 `Check`，必须走 `parseClientMessage` 或 decoder。

类型全部是 `export type`，运行时不残留 TypeBox 的 schema 值（除了 codec 模块自己持有的那份）。

## 和 client / server 的分工

| 需要 | 从哪 import |
|---|---|
| 发一条合法消息 | `encodeClientMessage` / `encodeServerMessage` |
| 收字节流 | `ServerMessageDecoder` / `ClientMessageDecoder` |
| 握手版本 | `PROTOCOL_VERSION`、`isSupportedProtocolVersion` |
| 校验 UUID 文件名 | `isServerId` |
| 帧上限常量 | `DEFAULT_MAX_FRAME_LENGTH` |
| 直接玩 CBOR | `encodeCbor`（测试 / fuzz；产品别走） |

Chord 的 `parseServiceCall` **不**在本包。server 在 `handleRequest` 里自己调 chord。

## 失败与边界

本文件无逻辑。改协议形状去 `protocol.ts`，改二进制去 framing/cbor，改失败是否断开连接去 codec 的 failed 标志。

## 下一课

字节能编能解了。客户端如何把 decoder 接到 socket 上，并从 hello 走到 `request()`：[client 00-模块导读](/series/pi-source/client/389-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/) → [client.ts 的 `Client.connect`](/series/pi-source/client/395-client-ts/)。对端从 [server listener](/series/pi-source/server/401-listener-ts/) 接进来。
