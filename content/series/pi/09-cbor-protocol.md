---
title: 第09讲·线格式：framed CBOR 协议
summary: 拆解 pi-protocol 的手写长度前缀 CBOR 编解码、TypeBox 校验与分帧，对比 JSON 与 protobuf 的取舍。
objectives:
  - 说明 encodeCbor/decodeCbor 实现的严格 RFC 8949 子集及其长度上限
  - 解释 framing 的 4 字节大端长度前缀如何支撑流式分帧
  - 对比手写 CBOR 方案相对 JSON、protobuf 的工程取舍
keyPoints:
  - CBOR 编解码是严格、定长的 RFC 8949 子集，带 maxByteLength 上限，cbor/encoder.ts:211、decoder.ts:161
  - framing 用 4 字节大端长度前缀界定一帧，上限 16MiB，framing.ts:6/28/58
  - codec 层先以 TypeBox 校验再编码/解码，encodeClientMessage 等做"校验+封帧"，codec.ts:79/84/129/146
  - pi-protocol 仅依赖 typebox（package.json:42），零代码生成、零 schema 注册表
  - PROTOCOL_VERSION=1 写死在 schemas.ts:3，作为握手与兼容基线
tags: [pi, pi-protocol, CBOR, 线格式]
---

两台机器要对话，得先约定"怎么把对象变成字节"。这就像两个人跨国交流：可以写冗长的英文信（JSON），也可以各自带本密码本照着编码（protobuf）。pi 选了第三条路——**CBOR**：一种紧凑的二进制格式，再自己手写一个"长度前缀 + 严格子集 + TypeBox 校验"的小而美的线格式层。

本讲我们看 `pi-protocol` 怎么把"对象 ↔ 字节"这件事做得既小又稳。

## 一、结论：线格式 = 手写长度前缀 + CBOR + TypeBox 校验

先纠正一个常见误解：**pi 没有用 protobuf，也没有用代码生成器**。它的协议层是手写的，而且 `package.json` 的依赖列表（`:42`）里**只有 `typebox` 一个运行时依赖**：

```json
"dependencies": {
  "typebox": "1.3.7"
}
```

逐行：这意味着协议层的"体积"几乎为零——没有 protobuf 编译器、没有 `.proto` 注册表、没有 grpc 运行时。整个 `encode/decode/framing` 都是几十行到几百行可读的 TypeScript。为什么这么克制？因为协议层要**能被任何宿主（Node、浏览器、Deno）零负担引入**，依赖越轻，嵌入成本越低。

整条链路的分工是：

```
对象 ──TypeBox 校验──► CBOR 编码（严格子集）──► 4字节长度前缀封帧 ──► 字节流
字节流 ──按帧切分──► CBOR 解码（严格子集）──► TypeBox 校验 ──► 对象
```

第 10 讲会看到这些"对象"具体是 `ClientHello` / `RequestEnvelope` 等 DTO；本讲先聚焦"字节怎么编"。

## 二、CBOR 编解码：一个严格子集的 RFC 8949

CBOR（RFC 8949）本身功能很全，但 pi 只实现其中**确定长度（definite-length）**的子集，并给字节总长设上限。编码器入口在 `cbor/encoder.ts:211`：

```ts
/** Encodes the protocol's strict, definite-length RFC 8949 subset. */
export function encodeCbor(value: unknown, options?: CborOptions): Uint8Array {
  const resolved = resolveOptions(options);
  const writer = new CborWriter(resolved.maxByteLength);
  encodeValue(writer, value, resolved, 0, new Set<object>());   // 递归编码值
  return writer.finish();
}
```

逐行：

- 注释直说这是"strict, definite-length RFC 8949 subset"——**只支持能预先确定长度的编码**，拒绝那些长度未知的流式/不定长形态。这让单帧可一次性边界清晰，配合分帧更安全。
- `resolveOptions(options)` 取出 `maxByteLength`，传给 `CborWriter`。这是个**上限护栏**：编码产物超过它直接报错，防止异常大的载荷悄悄占满内存。
- `encodeValue` 用 `new Set<object>()` 做环检测——遇到循环引用会抛错而非死循环。这是"严格"的另一面：协议值必须是有界、无环的纯数据。

解码器对称，在 `cbor/decoder.ts:161`：

```ts
/** Decodes exactly one item from the protocol's strict RFC 8949 subset. */
export function decodeCbor(bytes: Uint8Array, options?: CborOptions): unknown {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("CBOR input must be a Uint8Array");
  const resolved = resolveOptions(options);
  if (bytes.byteLength > resolved.maxByteLength) {            // 长度上限先卡一道
    throw new CborError(`CBOR byte length exceeds configured limit of ${resolved.maxByteLength}`);
  }
  return new CborReader(bytes, resolved).decode();
}
```

逐行：

- 第 2 行先类型守卫：非 `Uint8Array` 直接 `TypeError`——协议只认字节数组。
- 第 4 行在解码**前**就先查 `maxByteLength`。这很关键：恶意或出错的对端发来一个超大 blob，在"解析其内容"之前就被拒，避免了解码器为容纳它分配巨量内存（即"解压炸弹"类攻击的防线）。
- `new CborReader(bytes, resolved).decode()` 真正做递归解码，同样只认严格子集。

> **知识拓展：为什么是 CBOR 而非 JSON？**
> JSON 的 `number` 在解析后类型是 `number`（JS 双精度），对大整数、精确计数会丢精度；对象键顺序、重复键语义都含糊。CBOR 是二进制、类型明确（有独立的 int/float/string/bytes 等类型标签），体积更小、解析更快、语义更硬。对"会话要跨网络、要省带宽、要不歧义"的协议来说，CBOR 是比 JSON 更稳的底座。

## 三、Framing：4 字节大端长度前缀

CBOR 把"一个对象"编成字节，但网络上字节是**连续流**——你怎么知道"这一帧到哪结束、下一帧从哪开始"？pi 用最朴素也最可靠的办法：**每帧前面贴 4 字节的"本帧长度"**。`framing.ts:6` 先定义上限：

```ts
/** Default upper bound for one framed CBOR payload. */
export const DEFAULT_MAX_FRAME_LENGTH = 16 * 1024 * 1024;     // 16MiB
```

`encodeFrame`（`framing.ts:28`）负责贴前缀：

```ts
/** Prefixes a payload with its unsigned 32-bit big-endian byte length. */
export function encodeFrame(payload: Uint8Array): Uint8Array {
  if (!(payload instanceof Uint8Array)) throw new TypeError("Frame payload must be a Uint8Array");
  if (payload.byteLength > MAX_UINT32) throw new RangeError("Frame payload exceeds the unsigned 32-bit length limit");
  const frame = new Uint8Array(FRAME_HEADER_LENGTH + payload.byteLength);  // 4字节头 + 载荷
  const length = payload.byteLength;
  frame[0] = length >>> 24;   // 大端：最高字节
  frame[1] = length >>> 16;
  frame[2] = length >>> 8;
  frame[3] = length;          // 最低字节
  frame.set(payload, FRAME_HEADER_LENGTH);   // 载荷紧跟其后
  return frame;
}
```

逐行：

- `FRAME_HEADER_LENGTH = 4`（文件第 1 行），即长度前缀固定 4 字节。
- 第 4 行用 `MAX_UINT32` 兜底：4 字节最多表示约 4GiB，超过就 `RangeError`。但协议还有更紧的 `DEFAULT_MAX_FRAME_LENGTH = 16MiB`（`:6`）——这是"业务上限"，远小于 4 字节的理论极限，给对端内存留足余量。
- 第 7–10 行把 `length` 拆成 4 个字节的大端（最高位在前）写入帧头。大端是网络字节序的标准选择，跨平台无歧义。
- 第 11 行 `frame.set(payload, 4)` 把 CBOR 载荷原样拷到头之后。

解帧侧是 `FrameDecoder`（`framing.ts:58`）——它接收**任意碎片的**字节块（TCP 可能把一帧拆成几段、或把几帧粘成一段），内部维护"当前是否在读帧头 / 读载荷"的状态机，攒够一帧就吐出一个完整 payload。这正是流式传输所需要的：**生产者和消费者都不必关心底层 TCP 怎么切包**。

## 四、codec：把"先校验 TypeBox，再编码/解码"串起来

分帧和 CBOR 之上，是 `codec.ts` 这层"业务封装"。它把"TypeBox 模式校验"和"编解码+封帧"合成一步。看客户端消息的编码入口（`codec.ts:79`）：

```ts
/** Validates and encodes one complete length-prefixed client message. */
export function encodeClientMessage(message: ClientMessage, options?: FrameDecoderOptions): Uint8Array {
  return encodeProtocolMessage(message, parseClientMessage, "client", options);
}
```

`encodeProtocolMessage`（`:60`）的内部顺序是：先 `parseClientMessage(value)` 用 `Check(ClientMessageSchema, value)` **校验结构合法**，再 `encodeCbor` 编码，再 `encodeFrame` 封帧，最后 `assertCompleteFrame` 复核"封出来的帧恰为一整段"。任何一步失败都转成 `ProtocolValidationError`。

对称地，解码侧是可增量消费的 `ClientMessageDecoder`（`codec.ts:129`）和 `ServerMessageDecoder`（`:146`）：

```ts
/** Incrementally decodes and validates framed client messages. */
export class ClientMessageDecoder {
  private readonly decoder: ValidatedMessageDecoder<ClientMessage>;
  constructor(options?: FrameDecoderOptions) {
    this.decoder = new ValidatedMessageDecoder("client", parseClientMessage, options);
  }
  push(chunk: Uint8Array): ClientMessage[] { return this.decoder.push(chunk); }  // 喂字节，吐消息数组
  end(): void { this.decoder.end(); }
}
```

逐行：

- `ValidatedMessageDecoder`（`:88`）内部持有一个 `FrameDecoder`，`push(chunk)` 先把字节喂给分帧器切成 payload，再对每个 payload `decodeCbor` + `parseClientMessage` 校验，返回**已通过 TypeBox 校验的 `ClientMessage` 数组**。
- 关键点：**校验在解码后就完成**。上层拿到的是"保证符合 schema"的对象，不必再写一堆防御性判断。这也呼应了第 05 讲 `Message` 在本地是判别联合、而在线上是 TypeBox schema 的双重保障——同一份真理，两种表达。

`encodeServerMessage`（`:84`）和 `ServerMessageDecoder`（`:146`）是服务端的镜像，处理的 DTO 集合不同（第 10 讲详述）。

## 五、为什么不用 JSON / protobuf

把取舍摆在一张桌上：

| 维度 | JSON | protobuf | pi 的手写 CBOR |
|---|---|---|---|
| 类型严谨度 | 弱（number 歧义） | 强（schema 驱动） | 强（类型标签明确） |
| 体积 | 大（文本） | 小（二进制） | 小（二进制） |
| 依赖 | 内置 | 需编译器 + 运行时 | 仅 typebox |
| 调试可读性 | 高（肉眼可读） | 低（需 schema 反查） | 中（有 `cbor.me` 等工具） |
| 演进/代码生成 | 无 | 强（向后兼容规则） | 手写，演进靠 TypeBox schema |

pi 选 CBOR + 手写，核心诉求是：**零代码生成、依赖极小、且类型严谨**。protobuf 虽强，但要引入编译器与 `.proto` 注册表，对一个"想被任意宿主轻量嵌入"的协议层来说太重；JSON 太松、太肥。CBOR 的严格子集 + TypeBox 校验，恰好在"严谨"与"轻量"之间取到平衡点。

`PROTOCOL_VERSION = 1`（写死在 `schemas.ts:3`）是这套设计的版本锚点——第 10 讲握手时客户端会带上它，服务端据此决定是否兼容。

## 试一试

打开 `packages/protocol/src/framing.ts`，定位 `DEFAULT_MAX_FRAME_LENGTH`（`:6`）和 `encodeFrame`（`:28`）。回答：

1. `encodeFrame`（`:28`）第 4 行用 `MAX_UINT32` 兜底，而 `DEFAULT_MAX_FRAME_LENGTH` 是 16MiB。这两个"上限"分别卡在哪一层？如果一个 20MiB 的 payload 进来，会在哪一步被拒？
2. 翻到 `cbor/decoder.ts:161` 的 `decodeCbor`，它第 4 行先查 `maxByteLength` 再解码。为什么"先查长度"比"先解码"更安全？结合"解压炸弹"想一想。
3. 看 `codec.ts:79` 的 `encodeClientMessage`，它调用 `encodeProtocolMessage`（`:60`），后者顺序是"先 `parseClientMessage` 校验，再 `encodeCbor`，再 `encodeFrame`"。如果校验和封帧顺序反过来（先封帧再校验），会有什么隐患？

## 下一讲预告

线格式（字节怎么编）讲完了，但"字节里装的是什么对象"还没说。下一讲我们进 `pi-protocol` 的 DTO 层：`ClientHello` 怎么握手、`RequestEnvelope` / `ResponseEnvelope` / `EventEnvelope` 三种信封各管什么，以及 `SessionSnapshot` / `TranscriptItem` 如何把第 05 讲的本地 `Message` 镜像成传输无关的合同。
