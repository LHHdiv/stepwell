---
title: "12 · testing/host.ts — 内存 Session 和可闸门的 Harness"
summary: "协议/路由测试不该启动真正的 Agent。这份 host 用 MemorySessionRepo 当目录，TestHarness 假装 RoutedSessionHandle：记下 serviceCalls、可注入错误、可把 close"
tags: [pi, server]
---
源码：`packages/server/src/testing/host.ts`  
核心导出：`TestServerHost`、`TestHarness`、`createTestServerServices`、`Deferred`  
被谁调用：server 包测试；`createTestServer` 默认 host。

## 本课目标

协议/路由测试不该启动真正的 Agent。这份 host 用 `MemorySessionRepo` 当目录，`TestHarness` 假装 `RoutedSessionHandle`：记下 serviceCalls、可注入错误、可把 close/invoke/open 卡住（gate）。读完应能写出「attach 过程中关 server」这类竞态测试怎么闸。

## `Deferred<T>`

只有 resolve，没有 reject。测试里的「等到进入 close」用 `entered.promise`，测试方再 `release.resolve()` 放行。永远 resolve 是为了测时序不是测失败路径；失败用 `failClose` / `nextServiceError` 字段。

## `createTestServerServices`

实现最小 `pi.session-management`：

- `attach(sessionId)` → `presentation.attachSession`
- `detach()` → `presentation.detachSession`
- 返回 `null`（路由 id 走 attachment 消息）
- 其它 member throw（变成客户端看到的 internal_error，除非测试包成 RemoteServiceError）

没有 list / create。需要列 Session 的测试自己扩展 host。

## `TestHarness`

`attachClient` 增加计数，返回的 `invokeService` 推入 `serviceCalls`，默认返回 `{ ok: true }`。`release` 可 `failAttachmentRelease`。`close` 调底层 `session.close`，resolve `closed` 和 `terminated(undefined)`。`terminate(error)` 用于测 router 的 `invalidate`。

`gateNextClose` / `gateNextServiceCall`：下一次对应操作先 `entered.resolve`，再 await `release.promise`。测试 await entered，断言「还没 close 完」，再 release。

## `TestServerHost`

- `resolveSession`：list 过滤 id，0 条 NotFound，多条 Ambiguous
- `openSession`：可 gate、可 `nextOpenSessionError`（仍会 `session.close` 清理）、可把 `failClose` 传给新 harness
- `seed(id)`：create 后立刻 close，留下元数据供 attach
- `latestHarness(id)`：同一 id 多次 open 时取最后一个（测试重 attach / 重建 worker）

`now: () => 1` 让 MemorySessionRepo 时间确定。

## 失败与边界

- `invokeService` 忽略 `publish`。测订阅要自己写 host，或给 `nextServiceResult` 返回 snapshot 形状并在测试里另外推——本假 harness 不推 update。
- 这是测试替身，不是 Memory backend 的产品文档。产品 Session 语义看 agent-core。

## 下一课

不经 `pi-client` 打裸帧的测试客户端：[13-testing.client.ts.md](/series/pi-source/server/411-testing-client-ts/)。
