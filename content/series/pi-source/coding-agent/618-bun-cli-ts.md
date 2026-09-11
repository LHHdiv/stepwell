---
title: "82 · bun/cli.ts — 编译成 bun 二进制的入口"
summary: "必须先 sandbox 再 runtime 再 CLI：process.env 空着时，后面模块顶层读 env 会得到错误的空对象。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/bun/cli.ts`  
谁加载：`bun build --compile` 的 entry。顺序：

```ts
import "./sandbox-env-setup.ts";
import "./runtime-setup.ts";
import "../cli.ts";
```

必须先 sandbox 再 runtime 再 CLI：`process.env` 空着时，后面模块顶层读 env 会得到错误的空对象。

和 Node 发布入口的差异全在前两个 import，`cli.ts` 本身共用。

## 下一课

[83-bun.sandbox-env-setup.ts.md](/series/pi-source/coding-agent/621-bun-sandbox-env-setup-ts/)
