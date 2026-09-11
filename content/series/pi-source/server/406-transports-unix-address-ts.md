---
title: "08 · transports/unix/address.ts — `{serverId}.sock`"
summary: "逻辑 id 和物理路径的唯一焊点。读完应知道为什么要再校验一遍 UUIDv4，而不是相信调用方。"
tags: [pi, server]
---
源码：`packages/server/src/transports/unix/address.ts`（10 行）  
核心导出：`getUnixSocketPath`  
被谁调用：实验 `startForegroundServer`；client `discoverUnixServers` 依赖**同一命名约定**，但 client 自己拼 `join(directory, name)`，不 import 本函数。

## 本课目标

逻辑 id 和物理路径的唯一焊点。读完应知道为什么要再校验一遍 UUIDv4，而不是相信调用方。

## 实现

```ts
export function getUnixSocketPath(serverId: string, serverDirectory: string): string {
  if (!/^[0-9a-f]{8}-...$/.test(serverId)) {
    throw new TypeError("Unix serverId must be a canonical lowercase UUIDv4");
  }
  return join(serverDirectory, `${serverId}.sock`);
}
```

正则与 protocol 的 `ServerIdSchema` 相同。这里不用 `isServerId`，避免 unix 子路径为了一个谓词依赖整个 protocol 运行时……实际上 listener 已经依赖 protocol 的 `DEFAULT_MAX_FRAME_LENGTH`。重复正则是为了 address 模块保持单向、可单独读。

`join`：directory 若是绝对路径，结果绝对。实验代码用 `~/.pi/server` 或 `PI_SERVER_DIR`。README 警告不要从无界 home 路径推过长的 socket 路径——有的 OS 对 sun_path 有 ~100 字节限制。

## 失败与边界

- 不 `mkdir`。listener start 才会 `mkdir(dirname(path), { recursive, mode: 0o700 })`。
- 不处理 Windows。
- 文件名必须让 `isServerId(filename.slice(0,-5))` 为真，否则 client discovery 看不见。

## 下一课

真正 bind、替换 stale socket、背压：[09-transports.unix.listener.ts.md](/series/pi-source/server/407-transports-unix-listener-ts/)。
