---
title: "95 · utils/child-process.ts — Windows 友好的 spawn"
summary: "spawnProcess / spawnProcessSync：win32 走 cross-spawn（找 .cmd），其它 childprocess.spawn。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/child-process.ts`

`spawnProcess` / `spawnProcessSync`：win32 走 `cross-spawn`（找 `.cmd`），其它 `child_process.spawn`。

`waitForChildProcess`：不能只听 `exit`。子进程可能 exit 了，但被它 daemon 化的孙子还握着 stdout。`exit` 之后若管道仍有 data，把 100ms idle grace **重新计时**；stdout/stderr 都 end 或 idle 才 destroy 流。修 #5303 截断尾巴。`close` 仍立即 finalize。

自更新 `npm ci`、包管理器都用这个 wait。

## 下一课

[96-utils.fs-watch.ts.md](/series/pi-source/coding-agent/647-utils-fs-watch-ts/)
