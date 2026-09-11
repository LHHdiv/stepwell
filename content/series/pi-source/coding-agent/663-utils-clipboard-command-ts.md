---
title: "104 · utils/clipboard-command.ts — 跑一个剪贴板进程"
summary: "runClipboardCommand(cmd, args, { input, timeoutMs, maxBufferBytes })：默认 3s、50MB。写路径 stdio 把 stdout 设 ignore（防止 daemon "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/clipboard-command.ts`

`runClipboardCommand(cmd, args, { input, timeoutMs, maxBufferBytes })`：默认 3s、50MB。写路径 stdio 把 stdout 设 ignore（防止 daemon 占着管道）。超缓冲 SIGKILL。失败（非 0、timeout、error）resolve `undefined`，空 Buffer 算成功。stdin error 忽略——对端可能先退出。

## 下一课

[105-utils.clipboard-image.ts.md](/series/pi-source/coding-agent/665-utils-clipboard-image-ts/)
