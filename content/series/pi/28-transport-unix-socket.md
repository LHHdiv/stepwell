---
title: 第28讲·可插拔传输：Unix socket 与序列化管线
summary: 连接 client 与 server 的不是写死的 socket，而是一层可替换的传输抽象。本讲看 Unix domain socket 为何是本地默认，以及它和 stdio、网络的取舍。
objectives:
  - 说出 pi 传输抽象长什么样，为什么"可插拔"比"写死"好
  - 解释 Unix domain socket 相对 TCP / stdio 的本地优势
  - 把传输层和第 9-10 讲的 framed CBOR 协议拼成完整字节通路
tags: [pi, 传输, unix-socket, 信任边界]
keyPoints:
  - "client/src/unix.ts:12 的工厂返回 (handlers) => connectUnixSocket(...)，把'怎么连'抽象成对上层透明的传输"
  - "Unix domain socket（unix.ts:32 createConnection(path)）走文件系统寻址，不经网卡，天然受文件权限保护"
  - "framed CBOR（第 9 讲）负责'字节怎么切帧'，传输负责'字节怎么送到对端'——两层正交"
  - "传输可插拔：同款 PiServer/PiClient 可换 stdio、unix、甚至未来 websocket，内核不感知"
  - "本地默认 unix socket 的好处：无端口暴露、无网络监听、权限由 socket 文件路径的 ACL 决定"
---

第 27 讲我们看到 `PiClient` 用一个"连接工厂"连 server，但没细说这个工厂底下是什么。这一讲钻进传输层，看 pi 默认用的 **Unix domain socket**，以及为什么"传输"被做成可插拔的。

## 一、先结论：传输是独立于协议的另一层

回忆第 9 讲：pi 的线格式是 **framed CBOR**——它解决"一段对话消息怎么变成一串字节、怎么切帧"。但 framed CBOR 不关心"字节怎么从 A 进程到 B 进程"。那件事归**传输层**管。

两层正交：
- **协议层**（framed CBOR + 消息类型）：定义"说什么"。
- **传输层**（unix socket / stdio / 网络）：定义"怎么送到"。

`PiClient` 只认一个传输抽象——能 `connect`、能收发包、能断开。至于底下是哪种，由工厂决定。

## 二、Unix domain socket：本地的默认选择

看 `packages/client/src/unix.ts:32`：

```ts
function connectUnixSocket(path, maxPendingBytes, handlers) {
	const socket = createConnection(path);   // Node net 模块的 Unix socket
	// ...绑定 data/close/error 回调，包成 UnixByteTransport
}
```

`createConnection(path)` 连的是**文件系统里的一个 socket 文件**（如 `/tmp/pi-server.sock`），而不是 `IP:端口`。这带来三个本地优势：

1. **不经过网卡**：Unix socket 是内核内的进程间通信，数据不进网络栈，不会被局域网嗅探，也不占用 TCP 端口。
2. **文件权限即访问控制**：socket 文件路径的 Unix 文件权限（owner/group/mode）直接决定谁能连。你可以把它放在只有你用户可读的目录，等同"只有你能连这个 server"。
3. **无端口暴露**：没有监听的 TCP 端口，就没有"端口被扫到"的风险——对第 25 讲"风险隔离"是又一道加固。

> **知识拓展**：Docker 的 `docker.sock`、Postgres 的本地 socket、各种 daemon 的 IPC，默认都是 Unix domain socket。它几乎是"同机进程间安全通信"的工业标准答案。pi 沿用同一惯例。

## 三、和 stdio、TCP 的取舍

为什么不用更简单的 stdin/stdout（stdio）管道？或直接的 TCP？

| 传输 | 优点 | 代价 | pi 的取舍 |
|---|---|---|---|
| stdio | 零配置，父子进程天然连通 | 只能一对一、难多 client、难权限控制 | 适合"server 是 client 父进程"的极简场景 |
| Unix socket | 文件权限可控、可多 client、不占端口 | 需管理 socket 文件路径 | **本地默认**，平衡安全与灵活 |
| TCP | 跨机、易横向扩展 | 暴露端口、需鉴权防嗅探 | 留给"server 在远端"的部署 |

pi 把选择权留给部署：本地开发用 unix socket（安全省心），远端部署可换 TCP/加密通道。这正是第 26 讲说的"server 传输无关"——**同一套 `PiServer` 内核，配不同 listener 即可**。

## 四、把两层拼成完整字节通路

现在一条消息的完整旅程在字节层面闭合了：

```
AgentSession 产出消息
  → 第 10 讲封装成 ClientMessage
  → 第 9 讲 framed CBOR 编码 + 长度前缀切帧
  → 本讲传输层（unix.ts）把帧字节写进 socket
  → 内核送达 server 进程
  → server 按帧边界还原字节 → 解 CBOR → 得到 ClientMessage
```

反向同理。注意"切帧"（framing）和"送达"（transport）是两件独立的事：即便你明天把 unix socket 换成 websocket，第 9 讲的 framed CBOR 一行都不用改——因为 framing 已经在字节流里自描述了长度。

## 五、试一试

1. 在 `client/src/unix.ts:48` 附近看 `UnixByteTransport` 的构造，确认它是否实现了"收满一个 frame 才回调上层"的逻辑（Hint：找 `maxPendingBytes` 的处理）。
2. 在 `server/src/listener.ts` 里搜 `unix` 或 `stdio`，看 server 侧是否也有对应的 listener 实现，和 client 的 `unix.ts` 是否成对。
3. 思考：如果 socket 文件路径放在 `/tmp`（所有用户可写），第 28 讲说的"文件权限即访问控制"还成立吗？这暴露了默认部署的什么注意点？

## 下一讲预告

信任边界（client/server 与传输）讲完，我们回到用户看得见的界面——终端 UI。下一讲进入 `pi-tui`，看它如何用"差分渲染"在廉价终端上刷出流畅的流式对话。
