---
title: "15 · testing/index.ts — testing 子路径"
summary: "产品编码-agent 不要依赖这个路径。它把 MemorySessionRepo、裸 socket 客户端拉进测试图。实验生产 server 用真 host。"
tags: [pi, server]
---
源码：`packages/server/src/testing/index.ts`  
谁加载它：`@earendil-works/pi-server/testing`。

```ts
export type { WireChannel } from "./client.ts";
export { connectUnixTestClient, ProtocolTestClient } from "./client.ts";
export { createTestServerServices, Deferred, TestHarness, TestServerHost } from "./host.ts";
export type { TestServer, TestServerOptions } from "./server.ts";
export { createTestServer } from "./server.ts";
```

产品编码-agent **不要**依赖这个路径。它把 MemorySessionRepo、裸 socket 客户端拉进测试图。实验生产 server 用真 host。

和 telemetry 的 `/testing` 一样：从根包故意拆出去，避免 `Server` 的运行时依赖测试替身。

## 下一课

根入口：[16-index.ts.md](/series/pi-source/server/414-index-ts/)。
