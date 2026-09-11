---
title: "70 · tools/path-utils.ts — 模型给的路径经常「几乎对」"
summary: "Unicode 空格 → 普通空格；去掉开头 @（模型有时从「@path」复制）。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/path-utils.ts`

## `normalizeToolPath`

Unicode 空格 → 普通空格；去掉开头 `@`（模型有时从「@path」复制）。

`resolveToolPath`：absolutePath，失败 getOrThrow（工具层选择 throw，由 executeToolCall 收成 isError）。

## `resolveReadToolPath`

在 resolved 上试一组变体：窄不间断空格+AM/PM、NFD、弯引号。哪个 `exists` 用哪个，都不在则仍返回原 resolved（让随后 read 报 not_found）。write/edit **不用** 这套猜测，避免写到错误的 Unicode 副本。

## 下一课

[71 · file-mutation-queue.ts](/series/pi-source/agent/312-harness-tools-file-mutation-queue-ts/)。
