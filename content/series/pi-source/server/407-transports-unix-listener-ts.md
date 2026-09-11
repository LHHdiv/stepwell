---
title: "09 · transports/unix/listener.ts — 绑定、stale、连接背压"
summary: "Unix 域套接字最容易踩的坑不在 send，而在 文件名所有权：崩溃留下的 .sock、两个进程抢同一 path、close 时误删别人刚 bind 的新 socket。本文件用「先绑私有名再 link 到公共名」和「dev/ino "
tags: [pi, server]
---
源码：`packages/server/src/transports/unix/listener.ts`  
核心导出：`createUnixListener`、内部 `UnixByteConnection`（测试用 `@internal`）  
被谁调用：`createUnixServer`；也可单独测传输。

## 本课目标

Unix 域套接字最容易踩的坑不在 send，而在 **文件名所有权**：崩溃留下的 `.sock`、两个进程抢同一 path、close 时误删别人刚 bind 的新 socket。本文件用「先绑私有名再 link 到公共名」和「dev/ino 对上才 unlink」处理。读完应能讲 bind 的那几步。

## 在系统中的位置

```text
createUnixListener({ path, ... })
  start(accept)
    mkdir dirname mode 0700
    清 stale(path) 和 stale(ownedBindPath)
    listen(ownedBindPath)          # 不是直接 listen(path)
    link(ownedBindPath, path)      # 公共名出现
    chmod path
    unlink ownedBindPath
```

client 连的是公共 `path`。

## 私有 bind 名

`getOwnedBindPath`：`bind-` + `sha256(path)` 前 8 hex，同目录。两个 listener 绑同一公共 path，私有名也相同，后到的 `listen` 会 EADDRINUSE——在 link 之前就失败。

## stale 清除

`removeStaleSocket`：

1. lstat，ENOENT return
2. **不是 socket** → throw，拒绝删掉普通文件（防 path 配错成目录里的重要文件）
3. `isSocketLive`：connect 成功或 1s 超时当「有人在听」→ throw `already running`；ECONNREFUSED 等当死 socket
4. rename 到 `stale-xxxxxx` 再 unlink。rename 后核对 dev/ino 仍是原来那个——若期间被替换，把文件 rename 回去并 throw

这避免「我以为是 stale，其实新 server 已经用这个 inode」。

## start 失败

`closeServerAndCleanup`：关掉 net.Server，unlink 私有 bind 路径，再 `cleanupOwnedSocket` 按记录的 identity 清公共 path。

## `cleanupOwnedSocket`（正常 close）

记住 bind 成功后的 `{dev, ino}`。close 时 lstat 公共 path，对不上（别人已经替换）则 **不动**。对得上则 rename 到 `cleanup-` 再删。若 rename 后发现 inode 变了且公共名已经没了，还回去。这是「不要误删后任的 socket」。

## `UnixByteConnection`

与 client `UnixByteTransport` 对位：pending 字节上限、slice 拷贝、write 链。差别：

- 服务端 `close(finalChunk?)` 要等 writeTail，再 `socket.end(finalBytes)`，timeout 到了 destroy
- 没有 drain 等待那么细（write callback 即完成）；client 为了背压更认真等 drain
- `markClosed` 在 socket `close` 事件里由 listener 调用，也会 resolve close Promise

`acceptSocket`：closing 则 destroy。否则 `accept(connection)` 得到 handler，data/error/close 接上。error 时 destroy。

## `isSocketLive`

connect 成功 → live。ECONNREFUSED/ENOENT/EPIPE/ECONNRESET → 死。1s 超时当 live（对端可能慢，宁可不当 stale 删掉）。其它 errno reject，让 start 失败而不是误删。

## 失败与边界

- `chmod` 在 win32 直接 skip；ENOSYS/ENOTSUP 忽略。
- 目录 `mkdir 0o700`。已存在的目录不会改权限——实验 `ensurePrivateServerDirectory` 在更外层 chmod。
- `UnixByteConnection` 导出给传输测试。产品代码用 `createUnixListener` 即可。
- 没有 SO_PEERCRED 鉴权。能连到 socket 的进程就是对等方。目录必须私有。

## 下一课

一行焊上 Server：[10-transports.unix.preset.ts.md](/series/pi-source/server/408-transports-unix-preset-ts/)。
