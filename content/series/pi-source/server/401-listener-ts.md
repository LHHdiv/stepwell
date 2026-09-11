---
title: "03 · listener.ts — Server 对传输的唯一依赖"
summary: "和 client 的 ByteTransportFactory 对称：server 不认识 socket。Listener 负责 bind、鉴权（本实验 Unix 没有鉴权，只靠目录权限）、把每条连接变成 ByteConnection "
tags: [pi, server]
---
源码：`packages/server/src/listener.ts`（9 行）  
核心导出：`ServerListener`  
被谁调用：`Server.start` 对每个 listener `start(accept)`；Unix 实现这个接口。

## 本课目标

和 client 的 `ByteTransportFactory` 对称：server 不认识 socket。Listener 负责 bind、鉴权（本实验 Unix **没有**鉴权，只靠目录权限）、把每条连接变成 `ByteConnection` 交给 `accept`。

## 接口

```ts
export interface ServerListener {
  start(accept: ByteConnectionAcceptor): Promise<void>;
  close(): Promise<void>;
}
```

`ByteConnectionAcceptor` 定义在 `connection.ts`：`(connection: ByteConnection) => ByteConnectionHandler`。`Server.accept` 就是这个函数。

`start` 必须在开始接受连接前把 `accept` 存下来。`close` 停 listen，并关掉已交出的连接（Unix listener 会 `connection.close()` 所有活 socket）。

`Server.startInternal`：逐个 await `listener.start`。中途失败则 close 已经 start 的那些，再 `closeServerState`。没有「部分监听」的对外状态。

## 失败与边界

- 多个 listener 共享同一个 `Server.accept`。连接计数是 server 级的。
- Listener 的 `onError`（Unix options）和 Server 的 `onError` 是分开的。Unix preset 把同一个函数塞两边。
- 本文件没有实现。下一课是连接状态，不是 Unix 细节。

## 下一课

一条连接在 Server 心里长什么样：[04-connection.ts.md](/series/pi-source/server/402-connection-ts/)。
