---
title: "152 · mini/shared/protocol.ts — mini 的服务合同"
summary: "defineService 本地版（不是 chord）。CommandResult = {ok:true}|{ok:false,error}，禁止 throw 过网。Remote<T> 把每个方法变成 Promise。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/shared/protocol.ts`

`defineService` 本地版（不是 chord）。`CommandResult = {ok:true}|{ok:false,error}`，禁止 throw 过网。`Remote<T>` 把每个方法变成 Promise。

四个服务：

| token | 谁提供 | 干什么 |
|---|---|---|
| `Lane` | worker | watch/start/prompt/steer/compact/abort/setModel |
| `Models` | worker | refresh/login/authReply + ModelsEvent |
| `Worker` | worker | `describe()` 给 server 认会话 |
| `Sessions` | server | list/attach |

`watch(presentationId)` 返回 snapshot + subscriptionId，事件按 id 投递，server 不广播给所有 TUI。login 是反转：worker emit `prompt` 事件，TUI `authReply`。

## 下一课

[153-experimental.mini.shared.rpc.ts.md](/series/pi-source/coding-agent/714-experimental-mini-shared-rpc-ts/)
