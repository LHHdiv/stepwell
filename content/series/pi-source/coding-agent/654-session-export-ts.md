---
title: "100 · session-export.ts — 导出当前分支为 JSONL"
summary: "exportSessionToJsonl(sessionManager, outputPath?, createTrailingEntries?)：新 header（新 timestamp，同一 id/cwd）+ getBranch()"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/session-export.ts`

`exportSessionToJsonl(sessionManager, outputPath?, createTrailingEntries?)`：新 header（新 timestamp，同一 id/cwd）+ `getBranch()` 上每条 **parentId 重写成线性**（导出不是分叉树，是当前路径）。可选 trailing 条目（分享元数据）。默认文件名 `session-ISO.jsonl`。

与磁盘上的原文件不同：旁支消失。import 这条文件等于单枝会话。

## 下一课

[101-settings-diagnostics.ts.md](/series/pi-source/coding-agent/656-settings-diagnostics-ts/)。
