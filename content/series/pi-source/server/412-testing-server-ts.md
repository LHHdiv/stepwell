---
title: "14 · testing/server.ts — 未 start 的测试 Server"
summary: "默认 serverId = \"00000000-0000-4000-8000-000000000001\"，符合 v4 正则（第 13 字符是 4，第 17 是 8）。测试里 client hello 核对、socket 文件名都可以写死"
tags: [pi, server]
---
源码：`packages/server/src/testing/server.ts`（29 行）  
核心导出：`createTestServer`  
被谁调用：server 测试在装上 Unix listener 或假 listener 之前。

## 本课目标

默认 `serverId = "00000000-0000-4000-8000-000000000001"`，符合 v4 正则（第 13 字符是 4，第 17 是 8）。测试里 client hello 核对、socket 文件名都可以写死。

```ts
export function createTestServer(options: TestServerOptions): TestServer {
  const host = options.host ?? new TestServerHost();
  return {
    server: new Server(host, {
      listeners: options.listeners,
      maxFrameLength, handshakeTimeoutMs,
      serverId: options.serverId ?? "00000000-0000-4000-8000-000000000001",
      onError: options.onError,
    }),
    host,
  };
}
```

`TestServerOptions` 省略 `serverId`（有默认），可注入 host。返回 `{ server, host }` 方便 `host.seed("session-1")` 再 `server.start()`。

**不**调用 `start`。测试决定何时听、听在哪。Unix 测试会自己 `createUnixListener({ path: tmp })` 放进 listeners。

没有 `onConnectionCountChanged` 默认值，测计数的测试自己传。

## 失败与边界

固定 UUID 不要当产品身份。只有测试。

## 下一课

testing 子路径门面：[15-testing.index.ts.md](/series/pi-source/server/413-testing-index-ts/)。
