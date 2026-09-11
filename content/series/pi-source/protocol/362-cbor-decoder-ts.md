---
title: "04 · cbor/decoder.ts — 恰好一条 item，不许尾巴"
summary: "和 encoder 对着读。重点不是 CBOR 教科书，而是本协议关掉了哪些 RFC 8949 特性：tag、不定长、break、非字符串 key、重复 key、非有限 float、不安全整数。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/cbor/decoder.ts`  
核心导出：`decodeCbor`  
被谁调用：`codec.ts` 的 `ValidatedMessageDecoder.push`，对 `FrameDecoder` 交出的每一帧。

## 本课目标

和 encoder 对着读。重点不是 CBOR 教科书，而是本协议关掉了哪些 RFC 8949 特性：tag、不定长、break、非字符串 key、重复 key、非有限 float、不安全整数。

## 在系统中的位置

```text
FrameDecoder  →  payload bytes
decodeCbor(payload, { maxByteLength: maxFrameLength })
  CborReader.decode()
    readItem(0)
    offset === byteLength  否则 trailing data
```

整段输入超 `maxByteLength` 在进 Reader 之前就拒绝。这和「单个 string 超长」是两道闸。

## `readItem`

第一个字节拆 `majorType = initial >>> 5`、`additionalInformation = initial & 0x1f`。

- major 0：无符号整数
- major 1：`-1 - n`，再检查 `Number.isSafeInteger`
- major 2：byte string → **新的** `Uint8Array`（`new Uint8Array(this.readBytes(length))` 拷一份，不把底层帧 buffer 交出去）
- major 3：text，`fatal` UTF-8；失败改抛 `CborError("... invalid UTF-8")`
- major 4：定长数组，循环 `readItem(depth + 1)`
- major 5：定长 map，key 必须是 string、不可重复；`Object.defineProperty` 写成可枚举可写可配置。用 defineProperty 而不是 `result[key] =`，是为了避开 `__proto__` 那种特殊赋值——key 叫 `"__proto__"` 时普通赋值会改原型。defineProperty 把它当成普通自有属性。
- major 6：直接拒绝 tags
- major 7：`readSimple`

`readLength`：ai 31（不定长）拒绝。长度再和对应 limit 比。

`readArgument`：ai 24–27 读 1/2/4/8 字节。8 字节路径先读高 32 再低 32；`high > 0x1fffff` 就超出 53 bit，拒绝。ai 31 在 argument 语境也是不定长，拒绝。ai 28–30 是保留值，`Malformed CBOR additional information`。

## simple / float

只认 20/21/22（false/true/null）和 27（float64）。**不认** 23（undefined）、25（half）、26（float32）、24（simple 一字节）。`undefined` 不是 JSON。

float64 必须有限；若解码出来是整数但不是安全整数（比如 `2^60` 的 float 表示），也拒绝。整数应走 major 0/1。

ai 31 在 major 7 是 break，不定长容器的结束符。本协议没有不定长，见到 break 就是畸形。

## `decode()` 的尾巴检查

`offset !== byteLength` → `CBOR payload contains trailing data`。一帧一条 item。攻击者在合法 map 后面塞字节，不能当「注释」混过去。framing 已经按长度切了，这是第二道：payload 内部也不能有第二 item。

## 失败与边界

- 截断：`readByte` / `readBytes` 查剩余长度，`Truncated CBOR payload`。和 framing 的截断不同：这里是「长度前缀说有 N 字节，N 字节到齐了，但 CBOR 自己还要更多」——通常是长度字段撒谎。
- 重复 key 拒绝。JSON.parse 会后者覆盖前者；本 decoder 更严。
- 非 string key（整数 key 是合法 CBOR）拒绝。encoder 只写文本 key，对端若用别的库按 canonical integer key 编码，过不了。
- 空输入：`readByte` 立刻 truncated。空帧过不了 decode。
- 输入必须是 `Uint8Array`。和 framing 一样。

## 下一课

cbor 目录的门面：[05-cbor.index.ts.md](/series/pi-source/protocol/363-cbor-index-ts/)。
