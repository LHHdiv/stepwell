---
title: "10 · transports/unix/preset.ts — `createUnixServer`"
summary: "看清 preset 不 start。返回的 Server 还要 await server.start()。launcher 先准备 host、锁 serverId，再 start。"
tags: [pi, server]
---
源码：`packages/server/src/transports/unix/preset.ts`（29 行）  
核心导出：`createUnixServer`  
被谁调用：实验 `startForegroundServer`；server README 示例。

## 本课目标

看清 preset **不** start。返回的 `Server` 还要 `await server.start()`。launcher 先准备 host、锁 serverId，再 start。

## 实现

```ts
export function createUnixServer(host, options): Server {
  const listener = createUnixListener({ path, mode, maxFrameLength, maxPendingBytes, gracefulCloseTimeoutMs, onError });
  return new Server(host, {
    listeners: [listener],
    maxFrameLength, handshakeTimeoutMs, onConnectionCountChanged, serverId, onError,
  });
}
```

`onError` 同时给 listener 和 Server：listen 失败、socket error、协议内部错误都进同一个钩子。实验 launcher 用它打日志，不因此 exit——进程退出靠 SIGINT/`server.close`。

`maxFrameLength` 必须两边一致：listener 用它算 pending 下限，Server 用它建 decoder。只配一处，preset 拷过去。

## 失败与边界

- 不校验 path 与 serverId 是否匹配。调用方可把 serverId `aaa...` 绑到 `bbb....sock`。discovery 会按**文件名**当宣称 id，握手再核对 hello.serverId。不一致则客户端当 ProtocolValidationError 跳过。实验代码总是 `getUnixSocketPath(serverId, dir)`，对得上。
- 单 listener。要再加传输，别走 preset，自己 `new Server({ listeners: [...] })`。

## 下一课

unix 子路径门面：[11-transports.unix.index.ts.md](/series/pi-source/server/409-transports-unix-index-ts/)。
