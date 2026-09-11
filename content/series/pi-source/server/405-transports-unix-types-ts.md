---
title: "07 · transports/unix/types.ts — Unix listener 的选项"
summary: "把「绑在哪」和「Server 逻辑选项」拆开。UnixServerOptions 是 Omit<ServerOptions, \"listeners\"> & UnixListenerOptions：preset 自己创建 listener"
tags: [pi, server]
---
源码：`packages/server/src/transports/unix/types.ts`  
被谁调用：`listener.ts` 的 `resolveUnixListenerOptions`；`preset.ts` 的 `UnixServerOptions`。

## 本课目标

把「绑在哪」和「Server 逻辑选项」拆开。`UnixServerOptions` 是 `Omit<ServerOptions, "listeners"> & UnixListenerOptions`：preset 自己创建 listener，调用方不要再传 listeners 数组。

## `UnixListenerOptions`

| 字段 | 默认 | 含义 |
|---|---|---|
| `path` | 必填 | 公共路由路径，如 `/run/user/1000/pi/<uuid>.sock` |
| `mode` | `0o600` | 文件权限，仅 owner 读写 |
| `maxPendingBytes` | `maxFrameLength * 4` | 每条连接出站排队上限 |
| `gracefulCloseTimeoutMs` | 5000 | `socket.end` 后等多久再 destroy |
| `maxFrameLength` | 与 protocol 默认相同 | 用来校验 pending 下限：至少 `maxFrameLength + 4` |
| `onError` | | listen/accept 级错误 |

`maxPendingBytes < maxFrameLength + 4` 非法：一帧都塞不下。client 默认同样是 4 倍帧长，两端应对齐。

## 失败与边界

path 空字符串在 listener resolve 时 TypeError。mode 必须 `0..0o777` 的整数。Windows 上 listen 会在更底层失败（本包 unix 假定 POSIX）。

## 下一课

从 serverId 推导 path：[08-transports.unix.address.ts.md](/series/pi-source/server/406-transports-unix-address-ts/)。
