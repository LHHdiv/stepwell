---
title: "69 · renderers/write.ts — write 的 TUI"
summary: "renderCall：write path。renderResult：成功绿句；错误红。可展开看写入内容预览（从 tool call 参数 content 取，不是再读盘——abort 后参数仍在）。大文件预览截断显示。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/renderers/write.ts`

`renderCall`：`write path`。`renderResult`：成功绿句；错误红。可展开看写入内容预览（从 tool call **参数** `content` 取，不是再读盘——abort 后参数仍在）。大文件预览截断显示。

无磁盘副作用。

## 下一课

[70-tools-renderers-edit.ts.md](/series/pi-source/coding-agent/595-tools-renderers-edit-ts/)。
