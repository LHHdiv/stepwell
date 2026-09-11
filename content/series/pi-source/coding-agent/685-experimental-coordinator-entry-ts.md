---
title: "124 · experimental/coordinator-entry.ts — coordinator 进程入口"
summary: "shebang。consumeInternalProcessRole() 必须是 coordinator，否则 throw。runCoordinatorProcess(argv.slice(2))。打包后 dist/bundle/coo"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/coordinator-entry.ts`

shebang。`consumeInternalProcessRole()` 必须是 `coordinator`，否则 throw。`runCoordinatorProcess(argv.slice(2))`。打包后 `dist/bundle/coordinator.js` 对应本文件。

## 下一课

[125-experimental.server.ts.md](/series/pi-source/coding-agent/686-experimental-server-ts/)
