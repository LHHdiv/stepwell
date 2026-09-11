---
title: "01 · types.ts — Client 的对外形状"
summary: "先记住五个名字：ClientOptions、ConnectionState、ServiceSubscription、AttachmentChangeListener、Unsubscribe。后面 Client 的每个 public 方法"
tags: [pi, client]
---
源码：`packages/client/src/types.ts`  
被谁调用：`client.ts` 实现这些接口；`index.ts` 再导出给包用户。

## 本课目标

先记住五个名字：`ClientOptions`、`ConnectionState`、`ServiceSubscription`、`AttachmentChangeListener`、`Unsubscribe`。后面 `Client` 的每个 public 方法都在实现它们。

## `ConnectionState`

`"disconnected" | "connecting" | "connected"`。没有 `"reconnecting"`。`reconnect()` 只是再走一遍 `connect()`，中间会经过 disconnected。`ConnectionStateChange` 在断开时可带 `error`，连接中/已连接不带。

## `ClientOptions`

| 字段 | 含义 |
|---|---|
| `transportFactory` | 每次 connect 调一次，必须交出**新**的已认证字节连接 |
| `serverId` | 期望的逻辑服务器 UUIDv4。物理路径（socket 文件）不在这里 |
| `maxFrameLength?` | 传给 protocol decoder/encoder，默认 16MiB |
| `onListenerError?` | 订阅 listener / attachment listener throw 时的报告钩子。钩子自己再 throw 会被吞掉 |

`serverId` 在 `Client` 构造函数里 `isServerId` 校验。填错格式立刻 TypeError，不会等到握手。

## `ServiceSubscription`

`subscribeService` 的返回值：

- `id`：客户端生成的 `service-${seq}`，对端用它推 `service_update`
- `target`：订阅时的 RpcTarget 快照
- `snapshot`：Chord 完整状态。调用方必须先安装到自己的 replica，再 `start()`
- `start()`：开始按序投递 snapshot 之后缓冲的 update
- `dispose()`：发 unsubscribe（若仍连接且 target 仍是当前 attachment），并等投递队列结束

`start` 是刻意的两段式。若一边 hydrate 一边把 update 打进半成品 replica，Chord 的 delta 会对不上。协议侧在 snapshot 返回前到达的 wire update 进 `queuedWireUpdates`；decode 后、`start` 前的进 `queued`。

## 其它

`Unsubscribe` 就是 `() => void`。`onConnectionStateChange` / `onAttachmentChange` 返回它。dispose Client 会清掉 listener 集合，不必先 unsubscribe，但先退订更干净。

`AttachmentChangeListener` 收到 `SessionTarget | undefined`。`undefined` 表示当前没有选中 Session（detach 或断线）。

## 失败与边界

本文件无运行时逻辑。`ServiceSubscriptionSnapshot` 类型来自 chord，本包不解释 snapshot 里的业务字段。

## 下一课

错误类型：[02-errors.ts.md](/series/pi-source/client/391-errors-ts/)。
