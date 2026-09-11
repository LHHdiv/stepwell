---
title: "158 · mini/server/entry.ts — mini server 进程入口"
summary: "argv：<socketPath> <sessionsRoot>。runServer({ transport: socketTransport(socketPath), sessionsRoot })。由 TUI spawn 出来，st"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/mini/server/entry.ts`

argv：`<socketPath> <sessionsRoot>`。`runServer({ transport: socketTransport(socketPath), sessionsRoot })`。由 TUI `spawn` 出来，stdio ignore。

## 下一课

[159-experimental.mini.server.run.ts.md](/series/pi-source/coding-agent/720-experimental-mini-server-run-ts/)
