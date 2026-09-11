---
title: "06 · client.ts — `Client.connect`、request、订阅"
summary: "这是 client 包的产品表面。读完应能从源码指出：静态 connect 失败为何 dispose、request 如何带 cancel、订阅为何要 start()、attachment 消息如何成为后续 Session 调用的栅栏。"
tags: [pi, client]
---
源码：`packages/client/src/client.ts`  
核心导出：`Client`、`createClientServiceTransport`  
被谁调用：实验 `client-runtime.ts` 的 `Client.connect`；unix discovery 的 probe；应用 Chord binding。

## 本课目标

这是 client 包的产品表面。读完应能从源码指出：静态 `connect` 失败为何 dispose、request 如何带 cancel、订阅为何要 `start()`、attachment 消息如何成为后续 Session 调用的栅栏。

## 在系统中的位置

```text
const client = await Client.connect({ serverId, transportFactory });
await client.request({ serverId: client.hello.serverId }, attachCall);
client.onAttachmentChange((a) => { /* SessionTarget */ });
await client.request(client.attachment!, sessionServiceCall);
const sub = await client.subscribeService(target, serviceId, mode, listener);
sub.start();
```

## 构造 / 静态 `connect`

构造：校验 `serverId`，`new Connection`，把 `onHandshake` 写成 `this.#hello = hello`，`onMessage` → `#handleMessage`，`onStateChange` → `#handleConnectionStateChange`。

```ts
static async connect(options): Promise<Client> {
  const client = new Client(options);
  try {
    await client.connect();
    return client;
  } catch (error) {
    await client.dispose();
    throw error;
  }
}
```

失败必须 dispose：否则 connecting 期间登记的 listener、未完成的 factory 会漏。实例方法 `connect()` 失败（例如已经 connected 再调）**不会**自动 dispose——那是调用方的连接还想留着。静态方法是「给我一条活连接，否则什么都别留下」。

实例 `connect()`：已 dispose 则 reject `ClientDisposedError`；把 `#hello` 清掉再 `this.#connection.connect()`。`reconnect` 与它是同一个函数。注释和 README 说断线后要重新 attach，因为 `#handleConnectionStateChange(disconnected)` 会 `#setAttachment(undefined)`。

## `request` / `#request`

前置：未 dispose、`this.connected`、signal 未 abort。id 为 `request-${++seq}`。

若有 `AbortSignal`：abort 时 reject 同一 DOMException/reason，并 `sendCancel`（仅当帧已经 `sent` 且仍 connected）。先 abort 再 send 完成的竞态：`sent = true` 之后若 `aborted` 再补一帧 cancel。

编码：`parseServiceCall(call)` 先走 chord，再当 `JsonValue` 塞进信封。chord 解析失败本地 reject，**不断开**连接（`#takePendingRequest(id)?.reject`）。protocol 编码失败同样。只有「已经发出去」的协议问题才 `connection.fail`。

可选 `transform`：订阅路径用来在 resolve 之前 `decodeSnapshot`。transform throw → `ProtocolValidationError` 并且 `connection.fail`——snapshot 都解不出，连接不可信。

## `subscribeService`

1. 分配 `service-${seq}`，登记 `ActiveServiceListener`（decoder、两级队列、`hydrated/ready`）
2. `#request(createServiceSubscribeCall(...), transform=decodeSnapshot)`
3. transform 里 `hydrated = true`，把等待中的 **wire** update 解成 queued
4. 返回的 `start()` 把 queued 按序 `#deliverServiceUpdate`（`deliveryTail` then 链，listener 抛错进 `onListenerError`）
5. `dispose`：从表里删掉，若仍 connected 且 `#targetIsCurrent` 则发 unsubscribe，await deliveryTail

snapshot 返回前到达的 `service_update`：`#handleMessage` 看 `!hydrated` 就推进 `queuedWireUpdates`，**先不 decode**。避免 snapshot 的 encoder 状态和 update 对不上时过早失败。hydrate 失败会删 listener。

请求过程中断线：`#serviceListeners.clear()`，返回前再检查 map 里是不是自己，不是则 `DisconnectedError`。

## `#handleMessage`

三种：

**attachment**：`attachment.serverId` 必须等于本地 `options.serverId`（null 表示清空，跳过这检查）。然后 `#setAttachment`。相同三元组不通知。listener throw → `onListenerError`。

**service_update**：未知 subscriptionId 忽略（对端多推、本地已 dispose）。已 ready 则投递，否则进 queued。decode 失败 fail 整条连接。

**response**：没有 pending → `Response has no matching request`，fail 连接。这是严重的协议错（对端乱回 id，或本地已经因 abort 拿掉 pending 后仍回——abort 后对端仍可能回 response：此时 pending 已无，会误杀连接）。abort 路径：先 reject 再 sendCancel，pending 在 `#takePendingRequest` 时已删除……等等，abort 的 `onAbort` 只 `reject` + `sendCancel`，**没有** `#takePendingRequest`！pending 仍在。后来的 response 会进 `#takePendingRequest` 再 `resolve`/`reject` 一个已经 settled 的 Promise——第二次被忽略。连接保留。只有「从未发过的 id」才 fail。

`ok: false` → `new ServerError(message.error)`。

## 断线清理

`#handleConnectionStateChange(disconnected)`：hello 清空、attachment 清空、所有 pending reject、serviceListeners clear。**不**自动 dispose Client 对象，还可以 `reconnect()`。

`dispose`：标志位置位、pending 用 `ClientDisposedError` reject、`connection.disconnect(error)`、清 listener。`#disposePromise` 去重。实现是 `Promise.resolve()`，同步收尾。

## `createClientServiceTransport`

把「懒解析的 RpcTarget」适配成 Chord `RemoteServiceTransport`：`invoke` → `client.request`，`subscribe` → `subscribeService` 再把 `start` 映射成 `activate`。`getTarget()` 返回 undefined 时 throw `"Remote service target is unavailable"`——例如尚未 attach。binding 层据此显示「未连接」。

subscribe 的 listener 被包成 `(update) => listener(update, BACKGROUND_CONTEXT)`。Chord 要 Context，协议订阅没有应用 context，用 background。

## 失败与边界

- 已准入的服务端工作在 disconnect 后仍可能完成。客户端不会收到 response（pending 已 reject）。不要假设 abort/disconnect = 远端没跑。
- `#targetIsCurrent`：服务器级 target 只比 hello.serverId；Session target 必须三元组等于当前 attachment。unsubscribe 在已经 switch session 时不发，避免打到新附件上。
- `serviceCatalogue` 解失败同样 fail 连接。
- 没有 request 超时。超时用调用方 AbortSignal。

## 下一课

Node 上怎么把这套接到 Unix socket：[07-unix.ts.md](/series/pi-source/client/396-unix-ts/)。
