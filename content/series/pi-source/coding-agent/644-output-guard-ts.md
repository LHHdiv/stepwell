---
title: "95 · output-guard.ts — TUI 期间劫持 stdout"
summary: "takeOverStdout：process.stdout.write 改接到 stderr。TUI 占用 stdout 画屏，console.log 和 npm 进度不能破坏屏幕。真正要写主屏幕用 writeRawStdout（排队、"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/output-guard.ts`  
被谁调用：交互 mode start；package-manager 装包时看 `isStdoutTakenOver`。

`takeOverStdout`：`process.stdout.write` 改接到 **stderr**。TUI 占用 stdout 画屏，console.log 和 npm 进度不能破坏屏幕。真正要写主屏幕用 `writeRawStdout`（排队、ENOBUFS 重试）。`flushRawStdout` 在 stop 前排空。写失败非 EAGAIN 则 `process.exit(1)`。

`restoreStdout` 换回原 write。重复 takeover 是 no-op。

## 下一课

[96-pi-manifest.ts.md](/series/pi-source/coding-agent/646-pi-manifest-ts/)。
