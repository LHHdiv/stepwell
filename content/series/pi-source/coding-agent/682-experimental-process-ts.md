---
title: "121 · experimental/process.ts — 内部进程角色"
summary: "环境变量 PIINTERNALSPAWN = coordinator | server | session-worker。consumeInternalProcessRole 读完即删，避免子孙继承错角色。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/process.ts`

环境变量 `__PI_INTERNAL_SPAWN` = `coordinator` | `server` | `session-worker`。`consumeInternalProcessRole` 读完即删，避免子孙继承错角色。

`spawnInternalProcess`：detached、stdio ignore、`windowsHide`。Bun 编译体不能带外部 entryUrl。源码 Node 加 `--import source-resolver.ts` 才能解析 workspace alias。bundled Node 走 `dist/bundle/coordinator.js` 或 `cli.js`。

`encodeControlLine`：JSON+LF，超过 128MB throw。`terminateInternalProcess` SIGKILL 并等 exit。

## 下一课

[122-experimental.source-resolver.ts.md](/series/pi-source/coding-agent/683-experimental-source-resolver-ts/)
