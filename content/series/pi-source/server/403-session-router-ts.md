---
title: "05 · session-router.ts — 附件、打开、释放"
summary: "这是 server 包最容易读错的文件。它保证："
tags: [pi, server]
---
源码：`packages/server/src/session-router.ts`  
核心导出：`SessionRouter`（包内）  
被谁调用：只有 `Server`。

## 本课目标

这是 server 包最容易读错的文件。它保证：

1. 同一连接上的 attach/detach/Session 调用 **串行**（`runForClient`）
2. 同一 sessionId 并发 open **合为一次**（`openingSessions`）
3. 释放附件时先等已准入的 `invokeService` 结束
4. attachmentId 是 server 生成的 UUID，业务结果里没有它

读完应能指出「重复 attach 同一 session」为何幂等，以及 draining 时为什么还要 close 已打开的 handle。

## 结构

```text
hostedSessions: sessionId → { handle, attachments }
openingSessions: sessionId → Promise<HostedSession>
attachmentsByClient: connectionState 对象 → ClientAttachment
clientOperations: connectionState → 串行 tail Promise
```

`ClientAttachment`：`id`（UUID）、所属 hosted session、`operations` 集合、`lease`（RoutedSessionAttachment）、`acquiring` / `releasing` Promise。

## `runForClient`

经典 then 链：上一个操作无论成败，`catch(() => {})` 后跑下一个。tail 存在 map 里，finally 时若仍是自己就删除。这把同一连接上的 attach 和 request 排好——`executeServiceCall` 也走它。

注意 `executeServiceCall` 返回的是 `admitted.result`，而 `startServiceCall` 返回 `{ result: Promise }`：串行队列只等到 **准入**（找到 attachment、调用 `invokeService` 拿到 Promise），不等业务完成。业务 Promise 进 `attachment.operations`，release 时 `allSettled`。这样长订阅不会堵住同一连接上下一个 attach。

## `attachClientNow`

1. closing 或 client 已 disconnect → `ServerDrainingError`
2. 已 attach 同一 sessionId → return（幂等，不换 attachmentId）
3. `acquire(sessionId)`：已 hosted 则复用；否则 `host.resolveSession` + `openSession`
4. 若有旧附件（不同 session），先 `releaseAttachment(..., publish=false)`——先不发 attachment=null，马上会发新的
5. `handle.attachClient` 得到 lease
6. 期间若 hosted 被 invalidate / client disconnect / closing → 释放并 draining
7. `publishAttachment({ serverId, sessionId, attachmentId })` → 出站 attachment 消息

`acquire` 的 `open`：resolve + openSession 之后若已经 closing，要把刚拿到的 handle `close` 掉，再 throw `SessionCleanupError`（AggregateError 子类，包着 draining + close 失败）。`closeInternal` 只把 `SessionCleanupError` 记进最终失败，其它 opening 失败只 `reportError`。

`handle.terminated` 若存在，完成时 `invalidate`：从 hosted map 删掉，对每个附件 `releaseAttachment`。worker 挂了，连接还在，下一次 Session 调用会 `SessionNotAttachedError`。

## `requireAttachment`

Session 级调用：target 必须带 sessionId；map 里的附件 sessionId **和** attachmentId 都要匹配。只对上 session、id 是上一轮的，仍当未 attach。这挡住重放。

## `releaseAttachment`

用 `releasing ??=` 去重。先 `allSettled(operations)`，再 `lease.release`。`clearAttachment` 从 hosted 和 client map 删掉，可选 `publishAttachment(undefined)`。disconnect 路径 `publish=false`：连接已经在关，发帧会失败。

`removeSession`：给 `prepareSessionRemoval` 用。释放该 session 上**所有**连接的附件，再 `handle.close`。删除元数据前必须走这条，否则 worker 还占着写者。

## `closeInternal`

等所有 clientOperations 和 opening，释放所有附件，close 所有 handle。失败聚合成 AggregateError。`Server.closeServerState` await 它。

## 失败与边界

- **没有**跨连接的「同一 session 单附件」限制。多客户端可同时 attach 同一 session，hosted 一份 handle，多个 lease。host/worker 决定这是否安全。
- router 不解析 call。错误的 member 名由 Session 附件的 invokeService 去扔。
- `disconnectedClients` 集合：disconnect 期间 attach 会 draining，避免「关连接」和「新 attach」交错把 lease 留下。
- attachmentId 用 `randomUUID()`，不是 UUIDv7。只要求非空字符串协议。

## 下一课

把 decoder、handshake、router 焊进 `Server`：[06-server.ts.md](/series/pi-source/server/404-server-ts/)。
