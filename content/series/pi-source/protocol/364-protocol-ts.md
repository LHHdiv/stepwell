---
title: "06 · protocol.ts — 版本 8 的信封 schema"
summary: "把线上会出现的 8 种消息画成一张表，并理解 target 为什么分 server / session 两档。读完打开 client 的 #handleMessage 不会迷路。"
tags: [pi, protocol]
---
源码：`packages/protocol/src/protocol.ts`  
核心导出：`PROTOCOL_VERSION`、`isServerId`、各消息类型  
被谁调用：`codec.ts` 用 `ClientMessageSchema` / `ServerMessageSchema` 做 `Check`；client/server 只 import **类型**和 `PROTOCOL_VERSION` / `isServerId`。

## 本课目标

把线上会出现的 8 种消息画成一张表，并理解 `target` 为什么分 server / session 两档。读完打开 client 的 `#handleMessage` 不会迷路。

## 在系统中的位置

本文件是 TypeBox 描述，**没有**编解码。真正 Check 在 codec。schema 全部 `additionalProperties: false`（`StrictObject`），多一个字段整条拒绝。

`OpaqueJsonValueSchema = Type.Unsafe<JsonValue>(Type.Unknown())`：TypeBox 这一层不深入校验 JSON，交给 chord 的 `isJsonValue` 递归查。两边缺一不可。

## `serverId`

```ts
pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
```

规范小写 UUIDv4。`isServerId` 就是 `Check(ServerIdSchema, value)`。client 构造函数、server 构造函数、Unix 文件名 `{uuid}.sock` 都用同一谓词。大写 UUID、v1、带花括号，全部失败。

逻辑身份 ≠ socket 路径。launcher 可以让新进程复用同一个 serverId 和同一个 `.sock` 路径，替换旧进程。

## 客户端 → 服务端

| `type` | 何时 | 字段 |
|---|---|---|
| `hello` | 连接后第一帧 | `version`（整数 ≥ 0，不一定是 8；服务端再判） |
| `request` | 一次调用 | `id`、`target`、`call`（opaque JSON） |
| `cancel` | 取消尚未完成的 request | `id`、`target` |

`id` 是非空字符串。client 用 `request-${seq}`。重复 id 在服务端当 `invalid_request`。

`RpcTarget`：

```ts
{ serverId }                                    // 服务器级
{ serverId, sessionId, attachmentId }           // 某次展示附件
```

没有「只有 sessionId、没有 attachmentId」的档。延迟到达的帧如果还带着旧 attachmentId，服务端 `SessionNotAttachedError`。这就是换会话 / 重连后不误投的栅栏。

`call` 在协议层是 opaque。Chord 期望 `{ serviceId, member, args, instance? }`。解析失败时 server 回 `invalid_request` / `Invalid service call`，不断开连接（和信封畸形不同）。

## 服务端 → 客户端

| `type` | 何时 | 字段 |
|---|---|---|
| `hello` | 握手成功 | `version` **字面量 8**、`serverId` |
| `hello_error` | 握手失败（版本不对等） | `error: { code, message }` |
| `response` | 对应某 request | `ok: true, result?` 或 `ok: false, error` |
| `service_update` | 订阅推送 | `subscriptionId`、`update`（opaque） |
| `attachment` | 当前展示选中的 Session 路由变了 | `attachment: SessionTarget \| null` |

客户端 hello 的 `version` 是「我说话的版本」；服务端 hello 的 `version` 锁死为 8。不匹配时走 `hello_error`，`code: "version"`。client 发现 `hello.serverId !== options.serverId` 则本地 `ProtocolValidationError`，因为连错了逻辑服务器。

`response.result` 可选：无返回值的 member 可以只有 `{ ok: true }`。失败必须带 `ProtocolError`：`code` 非空字符串、`message` 字符串。server 把 `ServerError` / `RemoteServiceError` 的 code 透传；未知异常改成 `internal_error` + 固定文案 `"Internal server error"`，避免把栈泄漏过协议。

`attachment` 是 out-of-band。业务 `attach()` 的 result 是 `null`（测试 host 如此），真正的 `{ serverId, sessionId, attachmentId }` 跟在后面这条消息里。client 的 `Client.#handleMessage` 先更新 `#attachment` 再通知 listener。

## 失败与边界

- schema **不**校验 `call` 是否像 Chord。多一个未知信封字段会失败；`call` 里面多字段是 Chord 的事。
- `sessionId` / `attachmentId` / request `id` 只要求非空字符串，不是 UUID。attachmentId 由 `randomUUID()` 生成，但协议不强制。
- 没有 ping、没有 flow-control 消息。背压在 Unix transport 的 `maxPendingBytes`。
- 协议实验性，无兼容承诺。版本号 bump 时旧客户端 hello 会被 `hello_error`。

## 下一课

把 schema、CBOR、framing 焊成编解码器：[07-codec.ts.md](/series/pi-source/protocol/365-codec-ts/)。
