---
title: "02 · cbor/options.ts — 非信任载荷的上限"
summary: "CBOR 能表示任意深的树。对端不可信，所以三项上限是协议的一部分，不是「性能调优」。读完应能背出默认值，以及 textDecoder 为什么 fatal: true, ignoreBOM: true。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/cbor/options.ts`  
核心导出：`CborOptions`、`resolveOptions`、`CborError`、默认上限、`textEncoder` / `textDecoder`  
被谁调用：同目录 `encoder.ts` / `decoder.ts`。

## 本课目标

CBOR 能表示任意深的树。对端不可信，所以三项上限是协议的一部分，不是「性能调优」。读完应能背出默认值，以及 `textDecoder` 为什么 `fatal: true, ignoreBOM: true`。

## 默认上限

| 常量 | 默认 | 含义 |
|---|---|---|
| `DEFAULT_MAX_CBOR_BYTE_LENGTH` | 16 MiB | 整段输入/输出字节，以及单个 byte/text string 的长度 |
| `DEFAULT_MAX_CBOR_CONTAINER_LENGTH` | 1_000_000 | 数组元素数或 map 条目数 |
| `DEFAULT_MAX_CBOR_DEPTH` | 64 | 递归 item 深度 |

`maxDepth` 配置上限是 512（`MAX_CONFIGURED_DEPTH`）。再深，JS 调用栈自己先爆，而且协议不需要。`resolveLimit` 要求安全整数、`0..maximum`。

`UINT32_BASE = 2^32`、`MAX_UINT32` 给 encoder/decoder 拆 64 位整数用。JS number 只有 53 bit 安全整数，所以 decoder 对 8 字节整数会再卡一道。

## `CborError`

独立的 `Error` 子类，`name = "CborError"`。codec 把它包进 `ProtocolValidationError`，避免调用方区分「CBOR 坏了」还是「schema 没过」。产品路径几乎只看到后者。

## 编解码器共享的 Text 工具

```ts
export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
```

`fatal: true`：非法 UTF-8 抛 TypeError，encoder 里 `decode(bytes) !== value` 用来拒绝孤立代理项（JS 字符串可以有 unpaired surrogate，UTF-8 不能编它们；`TextEncoder` 会换成 U+FFFD，往返就不等了）。

`ignoreBOM: true`：BOM 当普通字符还是忽略？协议要确定性。忽略 BOM 意味着文本 `"\uFEFF" + "x"` 和 `"x"` 在「带 BOM 的 UTF-8 字节」上可能混淆——但 encoder 不会主动写 BOM，decoder 丢掉开头的 EF BB BF。这是 Web 惯例，避免「文件编辑器加了 BOM」那种假差异。对协议信封来说，key 和 string 都由自己的 encoder 产出，不会带 BOM。

单例 encoder/decoder。TextEncoder 是无状态的；TextDecoder 有流状态，但本包每次 `decode(完整 bytes)`，不走 stream 模式，所以共享安全。

## `resolveOptions`

缺省填默认。显式传入越界 → `RangeError`（不是 `CborError`）。这是调用方配置错误，不是载荷错误。client 把 `maxFrameLength` 传进 codec，codec 再当 `maxByteLength` 用，两边同一数字。

## 失败与边界

- `maxByteLength = 0`：连空 map 的一个字节都写不下，encoder 会 CborError。产品不会配 0。
- 深度从 0 起算：根 item 是 depth 0，嵌套一层 1。`depth > maxDepth` 才炸，所以默认允许 65 层？看 encoder：`if (depth > options.maxDepth)` 在进入 item **之后**、写内容之前。根调用 `encodeValue(..., 0)`，根对象的子键是 `depth + 1`。64 层嵌套对象刚好卡在边界上，第 65 层 throw。和 decoder 的 `readItem(depth)` 对称。

## 下一课

怎么把 JS 值写成 definite-length RFC 8949 子集：[03-cbor.encoder.ts.md](/series/pi-source/protocol/361-cbor-encoder-ts/)。
