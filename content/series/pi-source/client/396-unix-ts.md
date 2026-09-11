---
title: "07 · unix.ts — Unix 传输和本地发现"
summary: "两件事：把 node:net.createConnection(path) 做成 ByteTransportFactory；扫描目录里的 {uuid}.sock，用真握手探测谁还活着。读完应能指出 discovery 哪些错误该吞、哪些"
tags: [pi, client]
---
源码：`packages/client/src/unix.ts`  
核心导出：`createUnixTransportFactory`、`discoverUnixServers`  
谁加载它：`package.json` 的 `exports["./unix"]`。实验 client-runtime、unix-transport 测试。

## 本课目标

两件事：把 `node:net.createConnection(path)` 做成 `ByteTransportFactory`；扫描目录里的 `{uuid}.sock`，用真握手探测谁还活着。读完应能指出 discovery 哪些错误该吞、哪些该炸，以及 write 背压如何实现。

## Windows

入口两处都 `process.platform === "win32"` 则 throw。没有 named pipe 回退。实验 server 同样只做 Unix。

## `createUnixTransportFactory`

校验 path 非空、`maxPendingBytes` 为正安全整数，默认 `DEFAULT_MAX_FRAME_LENGTH * 4`（约 64MiB 排队）。返回的 factory 调 `connectUnixSocket`。

`connectUnixSocket`：

- `createConnection(path)` 立刻，connect 事件才 resolve transport
- 连上前 close/error → reject factory Promise（Connection 当成 DisconnectedError）
- 连上后 `end`/`close` → `handlers.onClose()`；`error` → `handlers.onError`
- `terminal` 标志保证只走一条终端路径
- `data`：把 Node Buffer 收成 `Uint8Array(chunk.buffer, byteOffset, byteLength)` 视图。Connection 的 decoder 会拷进自己的块，不长期借用这块 buffer

可选 `onSocket` 给 discovery 用：好在超时后 `socket.destroy()`。

## `UnixByteTransport.send`

1. 非 Uint8Array reject
2. 已 close reject
3. `#pendingBytes + len > max` reject（**不算进** pending，避免永远减不回去）
4. `chunk.slice()` 拷一份——调用方可能复用缓冲
5. 串到 `#writeTail` 上，保证调用序 = 写入序
6. `writeTail = tracked.catch(() => {})`：中间一次失败不让后续 send 的 then 链变成已经 rejected 的死链；但这次 send 的 Promise 仍 reject

`#write` 处理 Node `socket.write` 的 drain：返回 false 表示要等 `drain`。callback 和 drain 都到齐才 resolve。close 中途 fail。

`close`：标 closed、`markLocalClose`（让外层 terminal=true，避免 close 事件再 onClose？看 connectUnixSocket：`markLocalClose` 只设 `terminal = true`，随后 `destroy` 仍会触发 close，但 `close` handler 开头 `if (terminal) return`，所以**主动 close 不会**再调 `handlers.onClose`）。Connection `#failAndClose` 自己已经在状态机里断开了，不需要第二次 onClose。对端先关则 `terminal` 仍 false，onClose 正常进 Connection `#handleClose`。

## `discoverUnixServers`

1. `readdir`，ENOENT → `[]`（目录还不存在不算错）
2. 文件名必须 `{isServerId}.sock`，其它忽略
3. 最多 16 个并发 worker 抢 `nextIndex`
4. `lstat` 不是 socket 则 skip；ENOENT skip（readdir 后服务器关掉了）
5. `probeUnixServer`：真的 `new Client({ serverId: 文件名里那个 }).connect()`，带 timeout（默认 1s，`unref`）
6. 成功留下 `{ serverId, path }`；可忽略的失败返回 undefined
7. 意外错误写入 `failure`，其它 worker 看到 failure 就停；最后 throw
8. 结果按 serverId 字符串排序

probe 忽略：超时、`ProtocolValidationError`、无 cause 的 `DisconnectedError`、`ServerError code==="version"`、ENOENT/ECONNREFUSED/ECONNRESET/EPIPE/ETIMEDOUT。文件名声称的 id 和 hello.serverId 不一致会在 Connection 里变成 ProtocolValidationError，于是也被跳过——这正是「文件名即宣称的身份，握手验证」。

`isErrorCode` 沿 `error.cause` 链找，防 DisconnectedError 包着 ErrnoException。

finally：`client.dispose()`，若 socket 没 destroyed 再 destroy，并等 `close` 事件。避免探测留下 FD。

## 失败与边界

- discovery **只读**。不会删除 stale sock 文件。server 端 listener 启动时才清 stale。
- 并发 16：一个坏目录里几百个 sock 时，不会开几百条连接。意外错误仍 fail-fast。
- probe 的 Client 用默认 maxFrameLength。hello 很小，无所谓。
- `maxPendingBytes` 是应用层排队上限，不是 SO_SNDBUF。慢对端会被 Client 侧 send reject，Connection fail 整条连接。

## 下一课

包入口：[08-index.ts.md](/series/pi-source/client/397-index-ts/)。
