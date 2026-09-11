---
title: "11 · transports/unix/index.ts — unix 子路径导出"
summary: "四行导出对照 README。不要从根包找 createUnixServer——根 src/index.ts 不 re-export unix。"
tags: [pi, server]
---
源码：`packages/server/src/transports/unix/index.ts`  
谁加载它：`@earendil-works/pi-server/unix`。

## 本课目标

四行导出对照 README。不要从根包找 `createUnixServer`——根 `src/index.ts` 不 re-export unix。

```ts
export { getUnixSocketPath } from "./address.ts";
export { createUnixListener } from "./listener.ts";
export { createUnixServer } from "./preset.ts";
export type { UnixListenerOptions, UnixServerOptions } from "./types.ts";
```

没有 `UnixByteConnection`。测试若要从包外碰到它，走相对路径或包内 testing，不是 public API。

## 下一课

测试夹具从假 host 开始：[12-testing.host.ts.md](/series/pi-source/server/410-testing-host-ts/)。
