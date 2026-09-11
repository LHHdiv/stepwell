---
title: "08 · index.ts — client 根入口"
summary: "认清两个 export 条件：根包 runtime-neutral（只依赖 protocol + chord）；./unix 才碰 node:net / node:fs。浏览器或非 Node 宿主可以实现自己的 ByteTranspor"
tags: [pi, client]
---
源码：`packages/client/src/index.ts`  
谁加载它：`@earendil-works/pi-client`。Unix 符号**不**从这里出去。

## 本课目标

认清两个 export 条件：根包 runtime-neutral（只依赖 protocol + chord）；`./unix` 才碰 `node:net` / `node:fs`。浏览器或非 Node 宿主可以实现自己的 `ByteTransportFactory`，只 import 根。

## 导出

```ts
export { Client, createClientServiceTransport } from "./client.ts";
export { ClientDisposedError, DisconnectedError, ServerError } from "./errors.ts";
export type { ByteTransport, ByteTransportFactory, ByteTransportHandlers } from "./transport.ts";
export type { AttachmentChangeListener, ClientOptions, ... } from "./types.ts";
```

没有 `Connection`、没有 `createPromiseResolvers`。Connection 是实现细节。

`package.json` `"sideEffects": false`，利于 bundler 砍掉未用导出。

## 失败与边界

`import { createUnixTransportFactory } from "@earendil-works/pi-client"` 会失败，路径必须是 `@earendil-works/pi-client/unix`。实验代码两边都 import。

## 下一课

对端如何 accept 这条连接：[server 模块导读](/series/pi-source/server/398-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/) → listener → `Server.accept`。
