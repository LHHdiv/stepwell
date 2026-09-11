---
title: "05 · connection.ts — hello 握手状态机"
summary: "Client.connect 的真实工作在这里。读完应能指出：为什么 connecting 时必须先 send hello 再接受数据、serverId 在哪核对、旧连接的 data 如何用 sequence id 丢掉。"
tags: [pi, client]
---
源码：`packages/client/src/connection.ts`  
核心导出：`Connection`（包内，不从 `index.ts` 导出）  
被谁调用：只有 `Client` 构造函数 `new Connection({...})`。

## 本课目标

`Client.connect` 的真实工作在这里。读完应能指出：为什么 connecting 时必须先 send hello 再接受数据、serverId 在哪核对、旧连接的 data 如何用 sequence id 丢掉。

## 在系统中的位置

```text
Client.connect()
  Connection.connect()
    lifecycle = { state: "connecting", id, decoder, handshake }
    onStateChange({ state: "connecting" })
    transportFactory(handlers)
      send encodeClientMessage(hello)
    收到 ServerHello 且 serverId 匹配
      lifecycle = connected
      onHandshake(hello)
      onStateChange({ state: "connected" })
      handshake.resolve(hello)
```

之后 `Client.request` 调 `connection.send(frame)`；入站非握手消息进 `onMessage`。

## 生命周期联合类型

```ts
| { state: "disconnected" }
| { state: "connecting"; handshake; id; decoder; transport? }
| { state: "connected"; transport; handshake?; id; decoder }
```

connecting 阶段 `transport` 可能还没有：factory 是 async 的。若对端在 hello 发出前就推数据，`#handleData` 报 `Received server data before the client hello was sent`。这挡住「半开连接上的垃圾」和「连错了正在说话的别的协议」。

`#sequence` 每次 connect +1，handlers 闭包捕获 `id`。`#isCurrent(id)` 为假时 onClose/onError/onData 忽略——用户很快 disconnect 再 connect 时，旧 socket 的延迟 close 不能拆掉新连接。

## `connect` 的互斥

`state !== "disconnected"` 时 reject `Client is already ${state}`。没有内部队列。Client 的 `reconnect` 就是再 `connect`：必须先 disconnect（或已经因错误断开）。

`maxFrameLength` 在构造时校验 `1..0xFFFFFFFF`。0 非法（和 framing 允许 0 不同）。

## 发出 hello

`#openTransport`：factory 成功后，若仍是这次 connecting，把 transport 写进 lifecycle，再 `transport.send(hello 帧)`。send 失败 `#failAndClose`。若期间已经被换掉（id 不匹配），把刚拿到的 transport `close()` 丢掉。

hello 帧用 `PROTOCOL_VERSION`（8），`maxFrameLength` 与 decoder 相同。

## 处理 ServerHello

connecting 时：

- `hello_error` → `new ServerError(message.error)` 断开
- 非 hello → `Expected server hello as first message`
- `hello.serverId !== options.serverId` → 明确的 ProtocolValidationError，JSON.stringify 两边 id，方便日志
- 还没有 transport（理论上 data-before-hello 已挡，这里再挡一次 hello）→ 失败
- `onHandshake` throw → 断开，handshake reject
- 成功：先 `onStateChange(connected)`，再清掉 lifecycle 上的 handshake 引用，最后 `handshake.resolve(message)`

顺序有意：Client `#handleConnectionStateChange` 在 connected 时什么都不清；若先 resolve 再 onStateChange，await connect 的人可能立刻 `request`，而 Client 的 `connected` getter 已经看 lifecycle——此时已经是 connected，OK。把 handshake 字段清掉是防止 connected 之后再 fail 时二次 reject（`handshake?.reject`）。

connected 后再收到 hello / hello_error → 意外握手消息，断开。

## `send` / `fail` / `disconnect`

`send` 只在 connected。`transport.send` 同步 throw 或返回的 Promise reject，都 `#failAndClose`。catch 里再确认 `current.transport === lifecycle.transport`，避免关的是新连接。

`#fail`：设 disconnected，reject handshake（若还在），`onStateChange({ disconnected, error })`。**不** close transport——`#failAndClose` 才 close。`#handleClose`（对端关了）只 `#fail`，因为 transport 已经死了。

`#handleClose` 会 `decoder.end()`。截断帧的错误盖过普通 DisconnectedError。这很重要：对端在半帧处断开是协议错误，不是干净 shutdown。

## 失败与边界

- Connection **不**解释 response id、不缓冲 request。那是 Client 的 pending map。
- 没有自动重连。
- `onHandshake` 在状态翻成 connected **之后**、`onStateChange(connected)` **之前**调用。Client 用它赋值 `#hello`。若赋值后 onStateChange 的 listener throw，Client 自己 catch 并 `onListenerError`，不会回过来拆 Connection——除非 listener 调了 disconnect。
- Windows 上 Unix factory 会 throw，在 `#openTransport` 变成 DisconnectedError。

## 下一课

在 Connection 之上做 RPC 和订阅：[06-client.ts.md](/series/pi-source/client/395-client-ts/)。
