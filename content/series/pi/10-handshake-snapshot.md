---
title: 第10讲·握手与快照 DTO：ClientHello / SessionSnapshot
summary: 拆解 pi-protocol 的握手帧与三类信封，以及 SessionSnapshot/TranscriptItem 如何镜像本地消息。
objectives:
  - 说明 ClientHello/ServerHello 握手如何确立协议版本与初始快照
  - 区分 RequestEnvelope / ResponseEnvelope / EventEnvelope 三种信封的用途
  - 解释 SessionSnapshot 与 TranscriptItem 如何把本地 Message 镜像成传输无关合同
keyPoints:
  - ClientHello 是客户端首帧，带整数 version；PROTOCOL_VERSION=1 写死在 schemas.ts:3
  - ClientMessage = ClientHello | RequestEnvelope；服务端以 ServerHello 回带 ServerSnapshot，schemas.ts:397/412
  - RequestEnvelope 装 Command，ResponseEnvelope 回 ok/error，EventEnvelope 推 ServerEvent，schemas.ts:391/422/436
  - Command 是 list/create/attach/prompt 等操作的联合，schemas.ts:314
  - SessionSnapshot 含 transcript 数组，元素即 TranscriptItem（User/Assistant/Tool），schemas.ts:241/193
  - ServerSnapshot 带 protocolVersion 与 sessions/models 列表，schemas.ts:260
tags: [pi, pi-protocol, DTO, 握手]
---

两个人通电话，先得"喂？听得到吗？"对一下暗号，再开始聊正事。pi 的远程会话也一样：客户端上线第一件事不是发指令，而是**握手**——报上自己懂的协议版本，服务端确认兼容后回一份"当前世界长什么样"的快照。

本讲我们看 `pi-protocol` 的 DTO（数据传输对象）层：握手怎么握、指令和事件怎么装进"信封"、以及会话状态如何被镜像成一份**传输无关的合同**。

## 一、结论：传输无关的合同，全靠这些 DTO 描述

第 09 讲我们让"对象 ↔ 字节"跑通了。这些"对象"具体是谁？答案都在 `schemas.ts`，且第一行的版本锚点（`schemas.ts:3`）贯穿始终：

```ts
export const PROTOCOL_VERSION = 1 as const;     // :3 协议版本，写死为 1
```

逐行：`PROTOCOL_VERSION` 是字面量 `1`。它会出现在握手和每份 `ServerSnapshot` 里，作为"双方是否兼容"的硬判据。**版本故意用整数而非可 coerce 的字符串**——注释在 `ClientHelloSchema`（`:384`）强调这点，意思是 `"1"` 和 `1` 不能混，避免宽松比较埋坑。

整份 DTO 分两大族：`ClientMessage`（客户端→服务端）和 `ServerMessage`（服务端→客户端）。它们都建立在第 09 讲的 TypeBox schema 之上，因此线上字节一旦解码，就**保证**符合这些结构。

## 二、握手：ClientHello 开启会话

客户端连上后的**第一帧**必须是 `ClientHello`（`schemas.ts:385`）：

```ts
/** Must be the first frame sent by a client. Version is intentionally an integer, not a coercible string. */
export const ClientHelloSchema = StrictObject({
  type: Type.Literal("hello"),
  version: Type.Integer({ minimum: 0 }),       // 客户端懂的协议版本
});
export type ClientHello = Static<typeof ClientHelloSchema>;
```

逐行：

- `type: "hello"` 是判别标签，让解码器知道这是握手帧而非普通请求。
- `version` 是客户端支持的协议版本号（整数）。它**不是**"客户端软件版本"，而是"线格式合同版本"——向后兼容的分水岭。
- `StrictObject`（定义在 `schemas.ts:7`）带 `additionalProperties: false`，意味着多传一个未知字段都会被 `Check` 拒掉。这是"严格"的又一处体现：协议不纵容含糊的扩展字段。

服务端回以 `ServerHello`（`schemas.ts:412`），这帧信息量很大：

```ts
export const ServerHelloSchema = StrictObject({
  type: Type.Literal("hello"),
  version: Type.Literal(PROTOCOL_VERSION),     // 服务端实际使用的版本（必须=1）
  connectionId: IdSchema,                       // 本次连接标识
  snapshot: ServerSnapshotSchema,               // 连接建立时的全局快照
});
```

逐行：

- `version` 是 `Type.Literal(PROTOCOL_VERSION)`——服务端在这里**声明自己用的就是 1**。客户端比对自身 `version` 与服务端回的，不一致就走 `ServerHelloError`（`:418`）报错断开。
- `connectionId` 给这次连接一个稳定标识，后续多路复用或重连时有用。
- `snapshot` 是 `ServerSnapshot`——"服务端此刻的世界"。握手即把全局状态一次推给客户端，避免客户端再发一堆轮询。

注意 `ServerHello` 是 `ServerMessage` 联合（`schemas.ts:440`）的首项，与 `ClientHello` 形成对称的入口帧。

## 三、三种信封：Request / Response / Event

握手之后，真正的业务往来靠"信封"封装。`ClientMessage` 是 `ClientHello` 与 `RequestEnvelope` 的联合（`schemas.ts:397`）：

```ts
export const ClientMessageSchema = Type.Union([ClientHelloSchema, RequestEnvelopeSchema]);  // :397
```

`RequestEnvelope`（`schemas.ts:391`）装的是"一次指令请求"：

```ts
export const RequestEnvelopeSchema = StrictObject({
  type: Type.Literal("request"),
  id: IdSchema,                       // 请求 id，用于配对响应
  request: CommandSchema,             // 具体指令（见下）
});
```

逐行：

- `id` 是请求的唯一标识。`ResponseEnvelope` 会原样带回同一个 `id`，客户端据此把"响应"对回"请求"——和 HTTP 的请求/响应、或第 05 讲 `ToolCall.id` / `ToolResultMessage.toolCallId` 的配对哲学一致。
- `request` 是一个 `Command`（`schemas.ts:314`），它是操作的联合：

```ts
export const CommandSchema = Type.Union([
  ListCommandSchema, CreateCommandSchema, AttachCommandSchema, DetachCommandSchema,
  PromptCommandSchema, SteerCommandSchema, AbortCommandSchema,
  SetModelCommandSchema, SetThinkingCommandSchema,
]);   // :314
```

这些就是远程会话能做的动作：`list` 列会话、`create` 建会话、`attach`/`detach` 挂载、`prompt` 发提示、`steer` 中途插话、`abort` 中止、`set_model` / `set_thinking` 改配置。注意 `prompt` 正是第 02 讲 `session.prompt()` 在网络形态下的对应物。

服务端对"请求"的回应是 `ResponseEnvelope`（`schemas.ts:422`）——它用 `ok` 判别成败：

```ts
export const ResponseEnvelopeSchema = Type.Union([
  StrictObject({ type: "response", id: IdSchema, ok: true, result: CommandResultSchema }),   // 成功带结果
  StrictObject({ type: "response", id: IdSchema, ok: false, error: ProtocolErrorSchema }),    // 失败带错误
]);   // :422
```

逐行：

- `ok: true` 分支带 `result`（也是按 `command` 区分的联合，如 `CreateResult` 含新建的 `SessionSnapshot`）；`ok: false` 分支带 `error`（`ProtocolErrorSchema`，含 `code` 如 `version`/`busy`/`session_locked` 等）。
- 这种"一个信封两种形态"是典型的可判别联合，解码后 `if (r.ok)` 即可收窄类型，无需 `any`。

**但服务端还有一类消息不是对请求的回应，而是主动推送**——比如会话状态变了、流式进度来了。这用 `EventEnvelope`（`schemas.ts:436`）：

```ts
export const EventEnvelopeSchema = StrictObject({
  type: Type.Literal("event"),
  event: ServerEventSchema,            // 服务端主动事件
});   // :436

export const ServerEventSchema = Type.Union([
  StrictObject({ type: "server_snapshot", snapshot: ServerSnapshotSchema }),
  StrictObject({ type: "session_snapshot", snapshot: SessionSnapshotSchema }),
  StrictObject({ type: "session_progress", sessionId, progress: TranscriptProgressSchema }),
  StrictObject({ type: "session_removed", sessionId }),
]);   // :400
```

逐行：

- `EventEnvelope` 包一个 `ServerEvent`，后者有四种：`server_snapshot`（全局变了）、`session_snapshot`（某会话全量快照）、`session_progress`（增量进度，呼应第 06 讲流式 `delta`）、`session_removed`（会话被删）。
- 关键区别：**Request/Response 是"一问一答"，Event 是"服务端主动广播"**。这和第 02 讲"TUI 订阅 agent 事件流、agent 不主动推 UI"的解耦哲学如出一辙——只不过这里换成"客户端订阅服务端事件"。

把三组信封收齐：`ServerMessage = ServerHello | ServerHelloError | ResponseEnvelope | EventEnvelope`（`schemas.ts:440`）。请求-响应与推送-订阅两种通信模型，在一份合同里共存。

## 四、Snapshot DTO：SessionSnapshot / ServerSnapshot / TranscriptItem

最核心的"状态镜像"是 `SessionSnapshot`（`schemas.ts:241`）——它是一份会话在某个时刻的**完整、权威快照**：

```ts
export const SessionSnapshotSchema = StrictObject({
  id: IdSchema,
  name: Type.Optional(Type.String()),
  cwd: Type.String({ minLength: 1 }),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  phase: SessionPhaseSchema,
  model: ModelRefSchema,
  thinkingLevel: ThinkingLevelSchema,
  attached: Type.Boolean(),
  locked: Type.Boolean(),
  revision: Type.Integer({ minimum: 0 }),
  transcript: Type.Array(TranscriptItemSchema),     // 对话记录（核心！）
  queuedSteer: Type.Array(UserTranscriptItemSchema),
  queuedSteerCount: Type.Integer({ minimum: 0 }),
});   // :241
```

逐行：

- `transcript` 是 `TranscriptItem` 数组——这就是"这次会话聊了什么"的线上镜像。
- `revision` 是单调递增的整数版本号。每次快照更新 `revision+1`，客户端用它判断"我手上的快照是不是过期了"，避免基于旧状态做错操作。
- `model` / `thinkingLevel` / `phase` 等字段，正是第 05 讲 `Model` 元数据在网络形态的精简版（`ModelRefSchema` 只带引用，不塞全量价格）——再次印证"传输时只传必要信息"。

`TranscriptItem`（`schemas.ts:193`）是三类对话条目的联合，和第 05 讲的 `Message` 三元组**一一对应**：

```ts
export const TranscriptItemSchema = Type.Union([
  UserTranscriptItemSchema,        // ≈ UserMessage
  AssistantTranscriptItemSchema,   // ≈ AssistantMessage
  ToolTranscriptItemSchema,        // ≈ ToolResultMessage
]);   // :193
```

逐行：用户条目、助手条目、工具条目——这不就是第 05 讲 `Message = UserMessage | AssistantMessage | ToolResultMessage` 的"线上分身"吗？本地用 TypeScript 判别联合表达，线上用 TypeBox 判别联合表达，**同一套真理，两种 serialization**。这正是"传输无关合同"的含义：无论跑在内存还是网络上，`transcript` 的结构语义不变。

`ServerSnapshot`（`schemas.ts:260`）则是更大一层的"服务端世界快照"，握手时随 `ServerHello` 下发：

```ts
export const ServerSnapshotSchema = StrictObject({
  serverId: IdSchema,
  protocolVersion: Type.Literal(PROTOCOL_VERSION),   // 再次钉死版本
  revision: Type.Integer({ minimum: 0 }),
  sessions: Type.Array(SessionMetadataSchema),        // 所有会话的元信息
  models: Type.Array(ModelMetadataSchema),            // 服务端可见模型清单
});   // :260
```

逐行：

- `protocolVersion` 再次出现并锁定为 `1`，与握手的 `ClientHello.version` 形成双保险。
- `sessions` 是各会话的**元信息**（不含完整 transcript，省带宽），`models` 是服务端能用的模型清单——客户端据此渲染"可选模型"列表，无需自己维护。

> **知识拓展：快照 vs 进度，全量 vs 增量**
> 协议同时提供 `session_snapshot`（全量、权威）和 `session_progress`（增量、如 `assistant_delta` 文本增量）。客户端可先用快照建起完整状态，再用进度做丝滑更新——和第 06 讲 `AssistantMessageEvent` 带 `partial` 快照、TUI 增量渲染的思路完全同构。pi 在"本地事件流"和"网络协议"两处用了同一套设计语言。

## 试一试

打开 `packages/protocol/src/schemas.ts`，定位 `ClientHelloSchema`（`:385`）和 `RequestEnvelopeSchema`（`:391`）。回答：

1. `ClientHello.version` 是 `Type.Integer`，而 `ServerHello.version` 是 `Type.Literal(PROTOCOL_VERSION)`（`:412`）。如果一个老客户端发 `version: 0`、服务端是 `1`，握手会在哪一步、以什么错误失败？提示看 `ServerHelloError`（`:418`）。
2. `RequestEnvelope.id`（`:391`）和 `ResponseEnvelope.id`（`:422`）为什么要相同？如果把 `prompt` 请求和 `create` 请求的响应搞混，靠什么区分？（提示：除了 `id`，还有 `result` 里的 `command` 字段。）
3. 对比 `TranscriptItemSchema`（`:193`，User/Assistant/Tool 三类）与第 05 讲的 `Message` 联合（types.ts:455）。两者结构为何高度同构？这印证了本讲哪句话？

## 下一讲预告

握手、信封、快照都讲完了，远程会话的"数据合同"已经完整。但还有一个贯穿全栈、却一直没细说的横切关注点：**可观测性**。当一次 `prompt` 跨网络、跨供应商、跨工具，你怎么知道它慢在哪里、花了多少、为什么失败？下一讲我们进 `pi-telemetry`：看 pi 如何把"日志"重新定义成"spans/events 契约"，以及 `AI_TELEMETRY_SCHEMA` 这类 schema 如何让遥测既类型安全、又和日志彻底解耦。
