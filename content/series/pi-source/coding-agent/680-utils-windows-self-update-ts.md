---
title: "119 · utils/windows-self-update.ts — 给 npm 让路"
summary: "Windows 上正在运行的 pi.exe 加载了 .node 原生附件，npm 删不掉。quarantineWindowsNativeDependencies：用 process.report.getReport().sharedOb"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/windows-self-update.ts`

Windows 上正在运行的 `pi.exe` 加载了 `.node` 原生附件，npm 删不掉。`quarantineWindowsNativeDependencies`：用 `process.report.getReport().sharedObjects` 找出包目录内已加载的 so，rename 到 `node_modules/.pi-native-quarantine/<run>/`，再 copy 回原处——文件句柄仍指 quarantine，原路径可被 npm 覆盖。`cleanupWindowsSelfUpdateQuarantine` 在更新前尽量 rm 旧隔离目录。

找不到 node_modules 祖先则 noop。rename 失败忽略。

## 下一课

实验多进程从命令分发开始：[120-experimental.commands.ts.md](/series/pi-source/coding-agent/681-experimental-commands-ts/)
