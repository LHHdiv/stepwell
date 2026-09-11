---
title: "88 · exec.ts — 扩展的 spawn 助手"
summary: "execCommand(command, args, cwd, { signal, timeout })：shell: false，argv 数组，不经用户 shell。stdout/stderr 收成字符串。abort/timeout"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/exec.ts`  
被谁调用：扩展 `ctx.exec`；loader 里跑轻量命令。

`execCommand(command, args, cwd, { signal, timeout })`：`shell: false`，argv 数组，不经用户 shell。stdout/stderr 收成字符串。abort/timeout → SIGTERM，5 秒后 SIGKILL。`waitForChildProcess` 避免孙进程占着 stdio 挂死。

失败不 throw，返回 `code`（spawn 错当 1）。与 bash 工具不同：不截断、不合并流、不带 PI_*。

## 下一课

[89-experimental.ts.md](/series/pi-source/coding-agent/632-experimental-ts/)。
