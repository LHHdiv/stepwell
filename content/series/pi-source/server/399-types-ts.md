---
title: "01 · types.ts — 应用必须填的 Host 契约"
summary: "server 包的边界全在这份文件。读完应能画出：一条 TCP 连接如何变成 RoutedServerServiceAttachment，一次 attach 如何变成 RoutedSessionAttachment。"
tags: [pi, server]
---
源码：`packages/server/src/types.ts`  
被谁调用：`Server` 构造函数；实验 `server.ts` 实现 `ServerHost`；testing host 实现同一接口。

## 本课目标

server 包的边界全在这份文件。读完应能画出：一条 TCP 连接如何变成 `RoutedServerServiceAttachment`，一次 attach 如何变成 `RoutedSessionAttachment`。

## `ServerOptions`

- `listeners`：一组 `ServerListener`。Unix preset 只塞一个。理论上可多传输，`start` 按数组顺序 `await listener.start`。
- `serverId`：逻辑身份，UUIDv4。
- `maxFrameLength` / `handshakeTimeoutMs`（默认 5s）
- `onConnectionCountChanged` / `onError`：观测钩子，throw 不影响 server 状态。

## 四层能力对象

```text
ServerHost
  serverServices.attachClient(presentation) → RoutedServerServiceAttachment
      invokeService(call, publish, context)
      release()
  resolveSession(sessionId) → SessionMetadata
  openSession(metadata) → RoutedSessionHandle
      attachClient() → RoutedSessionAttachment
          invokeService(...)
          release()
      close()
      terminated?: Promise<Error | undefined>
```

`RoutedServerPresentation` 是 server 交给**应用**的窄接口：`attachSession` / `detachSession` / `prepareSessionRemoval`。应用的 session-management 服务收到 `attach(sessionId)` 时调 `presentation.attachSession`，**不要**自己把 attachmentId 塞进业务返回值。router 会另外 `publishAttachment`。

`publish` 回调：Session 附件上的订阅要推 update 时，调 server 给的 `publish(subscriptionId, update, context)`。server 用 per-connection 的 `ServiceStateEncoder` 编码后发 `service_update`。

`MaybePromise<T>`：host 实现可以同步或异步。router 一律 `Promise.resolve`。

## `terminated`

可选。worker 异常退出时 resolve 一个 Error（或 undefined 表示正常 close）。`SessionRouter.open` 若看到这个 Promise，会 `invalidate` 掉 hosted session，释放附件。实验 worker 管理用它回收。

## 失败与边界

- `openSession` 失败时，host 自己负责关掉已打开的 Session 对象。README 示例用 try/catch + `session.close`。router 在 `open` 返回前不会登记 hosted session。
- server **不**保证跨进程单写者。host 必须在开 worker 前拿到所有权。sqlite-node 也把跨进程锁推给 host。
- 类型参数 `TMetadata extends SessionMetadata`：实验 JSONL 元数据带 path 等字段，原样穿过 `resolveSession`。

## 下一课

会过协议边界的错误码：[02-errors.ts.md](/series/pi-source/server/400-errors-ts/)。
