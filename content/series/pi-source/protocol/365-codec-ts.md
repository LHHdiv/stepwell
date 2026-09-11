---
title: "07 · codec.ts — 校验、CBOR、成帧焊在一起"
summary: "这是 protocol 包对外真正被调用的 API。读完应能画出 push(chunk) → T[] 的管道，以及为什么解码失败后 decoder 作废。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/codec.ts`  
核心导出：`encodeClientMessage` / `encodeServerMessage`、`ClientMessageDecoder` / `ServerMessageDecoder`、`ProtocolValidationError`、`isSupportedProtocolVersion`  
被谁调用：client 的 `Connection`（编码 hello/request、解码 server 帧）；server 的 `Server`（反向）。

## 本课目标

这是 protocol 包对外真正被调用的 API。读完应能画出 `push(chunk) → T[]` 的管道，以及为什么解码失败后 decoder 作废。

## 在系统中的位置

```text
Client Connection.#openTransport
  encodeClientMessage({ type: "hello", version: 8 })
  transport.send(frame)

Server receive
  new ClientMessageDecoder({ maxFrameLength })
  decoder.push(chunk) → ClientMessage[]
  dispatchMessage
```

两端各持一个**单向** decoder：客户端只解 ServerMessage，服务端只解 ClientMessage。不要用错类。

## `parseClientMessage` / `parseServerMessage`

```ts
if (!Check(Schema, value) || !isJsonValue(value)) {
  throw new ProtocolValidationError("Invalid ... protocol message");
}
```

`Check` 管结构、字面量、UUID 模式、禁额外键。`isJsonValue` 管：没有 `undefined`、没有 NaN/Infinity、没有 Uint8Array、没有原型脏数据、没有循环。CBOR decoder 已经拒绝了其中大部分，这是对「有人绕过 CBOR 直接 parse」和「encoder 输入」的同一道门。

encode 路径也先 parse：你构造的对象多一个字段，本地立刻 throw，不会把畸形帧送出去。

## `encodeProtocolMessage`

parse → `encodeCbor(validated, { maxByteLength: maxFrameLength })` → `encodeFrame`。CBOR 或 framing 的异常（除已经是 `ProtocolValidationError`）包成 `Unable to encode ${kind} protocol message: ...`，消息截到 500 字符。防止巨大字符串或循环对象的 error.message 把日志打爆。

## `ValidatedMessageDecoder`

私有通用类。`ClientMessageDecoder` / `ServerMessageDecoder` 只是把 kind 和 parse 函数填进去。

`push`：

1. 已 failed → 立刻 throw「decoder has failed」（不再看 chunk）
2. `frames.push(chunk)` 可能 FrameError
3. 每帧 `parse(decodeCbor(frame, { maxByteLength }))`
4. 任何错：`this.failed = true`，再包成 `ProtocolValidationError`

失败是粘性的。半包脏数据不能「下一帧再试」。client 的 Connection 会 `failAndClose`；server 会 `failProtocol` 发 `hello_error` 或断开。

`end()`：把 framing 的截断翻译成 `Invalid ${kind} protocol framing`。已经 failed 的 end 也抛 failed，不调用 `frames.end()`。

## `isSupportedProtocolVersion`

```ts
return Number.isInteger(version) && version === PROTOCOL_VERSION;
```

只认恰好 8。client hello 的 schema 允许任何 ≥ 0 的整数，好让服务端能读到「对端说自己是 7」并回 `hello_error`，而不是在 decode 阶段就当畸形帧丢掉（那样对端看不到 version 错误码）。

## 失败与边界

- encode 时 `maxFrameLength` 同时限制 CBOR 字节和帧 payload。两者默认都是 16MiB。配小了，一条带大 snapshot 的 response 会在 **服务端 sendMessage** 失败，连接被关。
- decoder 一次 push 可产出多条消息。server 的 `receive` 循环里每次 `dispatchMessage` 前查 `isTerminalConnection`，避免 hello_error 之后还处理同一 chunk 里的 request。
- `ProtocolValidationError.name === "ProtocolValidationError"`。client unix discovery 把它当「不是我们的服务器，跳过这条 socket」。

## 下一课

包入口：[08-index.ts.md](/series/pi-source/protocol/366-index-ts/)。然后进 client 的 `Client.connect`。
