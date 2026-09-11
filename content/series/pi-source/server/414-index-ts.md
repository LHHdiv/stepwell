---
title: "16 · index.ts — server 根入口"
summary: "有：Server、全部 ServerError 子类、ServerListener、Host/Attachment 类型。"
tags: [pi, server]
---
源码：`packages/server/src/index.ts`（4 行）

```ts
export * from "./errors.ts";
export * from "./listener.ts";
export * from "./server.ts";
export * from "./types.ts";
```

有：`Server`、全部 ServerError 子类、`ServerListener`、Host/Attachment 类型。

没有：`SessionRouter`、`ConnectionState`、unix、testing。应用该用的 Unix API 从 `@earendil-works/pi-server/unix` 进。

## 三包串读到这里收束

```text
protocol framing + codec
  client Connection.connect / Client.request
  server UnixListener + Server.accept + SessionRouter
```

实验 coding-agent 在这层之上提供：Unix 目录锁、JsonlSessionRepo、Session worker、Chord facet（目录、transcript、模型）。那些文件不在本包，主课表排在 `coding-agent/src/experimental/`。

下一模块若关心「Session 如何落盘」，看 [session-backends](/series/pi-source/session-backends/367-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)（实现 harness `Storage`，现行实验 server 尚未改用它）。若关心「模型行为评测」，看 [evals](/series/pi-source/evals/725-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)。
