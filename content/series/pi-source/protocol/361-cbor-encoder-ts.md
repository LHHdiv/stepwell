---
title: "03 · cbor/encoder.ts — 严格、有限长度的 CBOR 子集"
summary: "这不是通用 CBOR 库。它故意少做很多事，好让 decoder 能在不信任输入上跑。读完应能列出：支持哪些 JS 类型、拒绝哪些、整数怎么选 major type、map 的 key 顺序是什么。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/cbor/encoder.ts`  
核心导出：`encodeCbor`  
被谁调用：`codec.ts` 的 `encodeProtocolMessage`。

## 本课目标

这不是通用 CBOR 库。它故意少做很多事，好让 decoder 能在不信任输入上跑。读完应能列出：支持哪些 JS 类型、拒绝哪些、整数怎么选 major type、map 的 key 顺序是什么。

## 在系统中的位置

```text
encodeClientMessage(msg)
  parseClientMessage(msg)           【schema + isJsonValue】
  encodeCbor(validated)
  encodeFrame(bytes)
```

先 schema 再 CBOR：非法信封根本不会进 encoder。encoder 仍拒绝 `undefined`、cycle、非有限数——防御 `isJsonValue` 漏网，以及内部直接调 `encodeCbor` 的测试。

## `CborWriter`

可增长缓冲，初始 `min(256, maxByteLength)`。`ensureCapacity`：超 `maxByteLength` 立刻 `CborError`；否则倍增，封顶在上限。`finish()` 用 `slice` 交出恰好写过的字节，切断与内部 buffer 的联系。

`writeFloat64` 自己写前缀 `0xfb`（major 7, ai 27）再 `DataView.setFloat64(..., false)` 大端。整数不走这条。

`writeArgument(majorType, value)`：CBOR 的 additional information。`< 24` 塞进第一个字节；否则 1/2/4/8 字节跟在后面。`value` 到不了 bigint，8 字节路径用 `writeUint64` 拆高 32 / 低 32。

## `encodeValue` 按类型

| JS | CBOR | 备注 |
|---|---|---|
| `null` | `0xf6` | |
| `true` / `false` | `0xf5` / `0xf4` | |
| 安全整数，且不是 `-0` | major 0 或 1 | 负整数编码 `-1 - value` |
| 其它有限 number | float64 | 含 `-0`、小数 |
| string | major 3 + UTF-8 | 往返必须等于原字符串 |
| `Uint8Array` | major 2 | 协议信封的 JSON 子集其实用不到；encoder 仍支持 |
| 无洞数组 | major 4 | `undefined` 和 hole 都拒绝 |
| 纯对象 | major 5 | 只编 `!== undefined` 的自有字符串键 |

拒绝：`undefined`（落到最后的 `Unsupported CBOR value type`）、bigint、function、Date、Map、带 prototype 的 class 实例、可枚举 symbol 键、循环引用、非有限数、非安全整数。

`isPlainObject`：prototype 是 `Object.prototype` 或 `null`（`Object.create(null)`）。Chord / TypeBox 产出的普通对象过得去；`new ServerError()` 过不去——所以必须先把信封变成 plain JSON。

数组用 `Object.hasOwn(value, index)` 查 hole。稀疏数组是攻击面（长度百万但只有几个元素）。

map 的 key 顺序是 `Object.keys` 顺序（创建序 / 整数键升序那套 JS 规则），**不是**规范的 canonical CBOR 排序。协议不要求 definite map 按 UTF-8 排序。decoder 接受任意顺序，只要 key 是唯一字符串。

`undefined` 值的键直接跳过，不写进 map。这让「可选字段没设」和「字段是 undefined」编码相同。`isJsonValue` 同样不容 `undefined`。

## 文本

`encodeText`：先 `TextEncoder.encode`，超长拒绝，再 `textDecoder.decode(bytes) !== value` 拒绝孤立代理。长度按 **UTF-8 字节数** 写 additional information，不是 JS `string.length`。

## 失败与边界

- `-0` 走 float64（`0xfb` + 8 字节负零），以免和整数 `0` 混。JSON 没有 `-0` 和 `+0` 的区别，但 `isJsonValue` 若放行 `-0`，encoder 仍可区分。协议信封里的数字来自 schema，一般是整数版本号。
- 不写 tag（major 6）、不定长（ai 31）、half-float。decoder 见到它们会炸，encoder 根本不生成。
- 循环检测用 `Set<object>`，进入容器 add、finally delete。共享子对象（无环）会编两次，这是对的。
- `encodeCbor` 每次新 `CborWriter` + 新 `Set`。无全局状态。

## 下一课

对称的读：[04-cbor.decoder.ts.md](/series/pi-source/protocol/362-cbor-decoder-ts/)。
