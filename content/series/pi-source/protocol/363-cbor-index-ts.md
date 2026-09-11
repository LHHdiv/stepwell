---
title: "05 · cbor/index.ts — CBOR 子目录导出"
summary: "30 秒认门。知道默认上限常量从这里出去，client 配 maxFrameLength 时对照的是同一组数字。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/cbor/index.ts`（10 行）  
被谁调用：`src/codec.ts` 从 `./cbor/index.ts` 拿 `decodeCbor` / `encodeCbor`；包根 `src/index.ts` 再 `export *`。

## 本课目标

30 秒认门。知道默认上限常量从这里出去，client 配 `maxFrameLength` 时对照的是同一组数字。

## 导出清单

```ts
export { decodeCbor } from "./decoder.ts";
export { encodeCbor } from "./encoder.ts";
export {
  CborError,
  type CborOptions,
  DEFAULT_MAX_CBOR_BYTE_LENGTH,
  DEFAULT_MAX_CBOR_CONTAINER_LENGTH,
  DEFAULT_MAX_CBOR_DEPTH,
} from "./options.ts";
```

没有 `CborWriter` / `CborReader`。没有 `resolveOptions`。调用方只看到「值 ↔ 字节」和三个默认常量。

`src/index.ts` 的 `export * from "./cbor/index.ts"` 让 `@earendil-works/pi-protocol` 根入口也能 `encodeCbor`。产品路径通常不直接调，走 `encodeClientMessage`。测试和对二进制格式本身做 fuzz 时会直接用。

## 失败与边界

单独 `encodeCbor` **不**做 TypeBox 校验。编出来的字节可能不是合法 ClientMessage。远程协议请走 codec。

## 下一课

信封长什么样：[06-protocol.ts.md](/series/pi-source/protocol/364-protocol-ts/)。
