---
title: "61 · tools/path-utils.ts — 工具路径解析"
summary: "resolveToCwd：~ 展开、相对 cwd、Unicode 空格规范化、剥 @ 前缀。 resolveReadPath / Async：在此之上试 macOS 截图文件名的几种 NFC/NFD/窄空格/弯引号变体，只用于读。写/改"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/path-utils.ts`  
被谁调用：所有文件类工具；`cli/file-processor.ts` 的 `@file`。

## 本课目标

`resolveToCwd`：`~` 展开、相对 cwd、Unicode 空格规范化、剥 `@` 前缀。  
`resolveReadPath` / `Async`：在此之上试 macOS 截图文件名的几种 NFC/NFD/窄空格/弯引号变体，**只用于读**。写/改用 `resolveToCwd`，避免写到「猜出来的」另一个文件。

变体顺序：原路径存在则用原路径；否则 AM/PM 窄空格、NFD、U+2019 弯引号、NFD+弯引号。都不存在返回第一次 resolve 的路径（让后续 access 报错）。

`pathExists` / `expandPath` 给 ls/find。

## 失败与边界

这不是沙箱：`../` 可以出仓库。cwd 来自 `ctx?.cwd || 构造时 cwd`。Windows 盘符由 `resolvePath` 处理。

## 下一课

[62-tools-file-mutation-queue.ts.md](/series/pi-source/coding-agent/579-tools-file-mutation-queue-ts/)。
