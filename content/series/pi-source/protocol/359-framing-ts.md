---
title: "01 · framing.ts — 四字节长度前缀"
summary: "把「TCP/Unix 给你的任意切片」还原成一条条完整 payload。读完应能指出：header 跨 chunk 怎么拼、0 长度帧合法、超限如何永久失败、end() 时半帧算截断。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/framing.ts`  
核心导出：`encodeFrame`、`FrameDecoder`、`DEFAULT_MAX_FRAME_LENGTH`、`FrameError`  
被谁调用：`codec.ts` 的 `encodeProtocolMessage` / `ValidatedMessageDecoder`；不直接被 client/server 引用。

## 本课目标

把「TCP/Unix 给你的任意切片」还原成一条条完整 payload。读完应能指出：header 跨 chunk 怎么拼、0 长度帧合法、超限如何永久失败、`end()` 时半帧算截断。

## 在系统中的位置

```text
socket "data"  chunk: Uint8Array     【可能半帧、可能多帧黏在一起】
  FrameDecoder.push(chunk)
    → Uint8Array[]  每条是去掉 4 字节头的 CBOR 字节
  decodeCbor(payload)
```

帧格式：`uint32be(payload.byteLength) || payload`。大端，和 CBOR 内部整数一样，跨语言好对。

默认上限 `DEFAULT_MAX_FRAME_LENGTH = 16 MiB`，与 CBOR `maxByteLength` 对齐。`maxFrameLength` 必须是 `0..0xFFFFFFFF` 的安全整数；0 表示只接受空 payload。

## `encodeFrame`

```ts
export function encodeFrame(payload: Uint8Array): Uint8Array {
  if (!(payload instanceof Uint8Array)) throw new TypeError(...);
  if (payload.byteLength > MAX_UINT32) throw new RangeError(...);
  const frame = new Uint8Array(4 + payload.byteLength);
  frame[0] = length >>> 24;
  ...
  frame.set(payload, 4);
  return frame;
}
```

编码端 **不**看 `maxFrameLength`。上限检查在 codec 里：先 `encodeCbor(..., { maxByteLength })` 再 `encodeFrame`。这里只挡 4GB 以上这种连 header 都写不下的。

`>>>` 无符号右移，保证 `length` 的高字节是 0–255，不会因为符号位变成 255。

## `FrameDecoder` 状态机

三个对外状态：`open` / `ended` / `failed`。`push` 在 ended/failed 上立刻 `FrameError`。失败是终端：清掉内部缓冲，再 push 也只报 failed。

内部还有「正在读 header」和「正在读 payload」两相，用 `expectedPayloadLength === undefined` 区分。

### 读 header

`header` 是固定 4 字节暂存。chunk 可能只带来 1 个字节：`headerLength` 累加，不够 4 就 `continue` 等下次 push。

满 4 字节后按大端拼长度。注意解码用乘法：

```ts
this.header[0]! * 0x1_000_000 + this.header[1]! * 0x1_0000 + ...
```

不用 `DataView`，避免依赖 chunk 的 ArrayBuffer 是否共享、是否有 byteOffset。和 encoder 的 `>>>` 对称。

长度 > `maxFrameLength` → `fail(...)`。长度 0 → 立刻产出 `new Uint8Array()`，**不**进入 payload 相。空帧合法，codec 会拿它去 decodeCbor，空字节不是合法 CBOR item，会在上一层变成 `ProtocolValidationError`。framing 自己不管内容。

### 读 payload：64KiB 块

不一次 `new Uint8Array(expected)`。按 `PAYLOAD_BLOCK_SIZE = 64KiB` 切块，最后一块可能更短。原因：恶意对端声明 16MiB 但只慢慢滴字节时，仍按声明上限分配，但至少按块增长；更重要的是单块帧走快路径：

```ts
if (this.payloadBlocks.length === 1) frames.push(this.payloadBlocks[0]!);
else { /* concat */ }
```

一条刚好落在一块里的帧（绝大多数 hello / 小 request）零拷贝交出那一块。块是 decoder 自己 `new` 的，不会 alias 调用方的 chunk。

`currentPayloadBlockLength` 记当前块写到哪。块满了再 `new` 下一块。`payloadLength === expected` 时拼好、清状态、**不**重置 chunkOffset——同一 chunk 里可能还有下一帧。

### `end()`

header 读了一半，或 payload 没齐，都是 `Truncated frame at end of stream`。Unix socket 对端 `destroy()` 会走到这里。client 的 `Connection.#handleClose` 调 `decoder.end()`，截断会盖过普通的「transport closed」。

`fail` 把所有缓冲字段清零再 throw。之后 `state === "failed"`，`push`/`end` 都拒绝。这防止截断后再用半包数据「恢复」。

## 失败与边界

- chunk 必须是 `Uint8Array`。Node `Buffer` 是 Uint8Array 子类，合法。普通 `Array` 会 TypeError。
- decoder 不处理乱序、不重传。传输必须保序（Unix socket / TCP 满足）。
- `maxFrameLength = 0` 只接受空帧。client/server 的构造函数要求 `maxFrameLength > 0`，所以产品路径不会走到 0；本文件单独允许。
- 产出的 payload 可能是 64KiB 块的底层数组（单块快路径）。调用方 decode 完不要假定它和别的帧不共享 buffer——下一次 push 会换新块，但当前这块已经交出去了，decoder 不再持有引用（`payloadBlocks = []`）。

## 下一课

payload 是 CBOR。先看限制怎么解析：[02-cbor.options.ts.md](/series/pi-source/protocol/360-cbor-options-ts/)。
