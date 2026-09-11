---
title: "154 · mini/shared/transport.ts — JSONL 双工"
summary: "Connection：send / onMessage / onClose / close。jsonConnection(readable, writable) 按 \\n 切 JSON。socketTransport(path)：lis"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/shared/transport.ts`

`Connection`：send / onMessage / onClose / close。`jsonConnection(readable, writable)` 按 `\n` 切 JSON。`socketTransport(path)`：listen/connect Unix socket，listen 时先 `rm` 旧 socket。`childConnection` / `parentConnection`：worker 的 stdio 在 spawn 时就存在，不需要地址。

## 下一课

[155-experimental.mini.tui.run.ts.md](/series/pi-source/coding-agent/716-experimental-mini-tui-run-ts/)
