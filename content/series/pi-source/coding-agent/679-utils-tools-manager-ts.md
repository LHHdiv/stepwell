---
title: "118 · utils/tools-manager.ts — 下载 fd / rg"
summary: "ensureTool(\"fd\"|\"rg\", onStatus)：PIOFFLINE 只找本地。否则：bin 目录已有 → 返回路径；系统 PATH 有（fd 还认 fdfind）→ 返回命令名；否则 GitHub release 下 m"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/tools-manager.ts`

`ensureTool("fd"|"rg", onStatus)`：`PI_OFFLINE` 只找本地。否则：bin 目录已有 → 返回路径；系统 PATH 有（fd 还认 `fdfind`）→ 返回命令名；否则 GitHub release 下 musl/darwin/msvc 包，解压 chmod 进 `getBinDir()`。`onStatus` 给 TUI 画「Downloading fd…」。`getLatestVersion` 打 GitHub API。`getToolPath` 只查不下载。

网络 10s、下载 120s。失败 throw，InteractiveMode 会 showError 但 TUI 已起来，自动补全可能没有 fd。

## 下一课

[119-utils.windows-self-update.ts.md](/series/pi-source/coding-agent/680-utils-windows-self-update-ts/)
