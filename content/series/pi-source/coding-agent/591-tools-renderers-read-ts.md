---
title: "68 · renderers/read.ts — read 的 TUI"
summary: "renderCall：read path:offset-limit，路径可点。兼容旧参数名 filepath。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/renderers/read.ts`  
被谁调用：`createReadToolDefinition` spread `readRenderers`。

## 画什么

`renderCall`：`read path:offset-limit`，路径可点。兼容旧参数名 `file_path`。

`renderResult`：语法高亮（按扩展名）；AGENTS.md / SKILL.md / 包内 docs 走更紧凑的分类标签。截断 details 显示「2000 lines / 50KB」。图片走 TUI image 能力。展开/折叠由 `ToolRenderResultOptions.expanded`。

不读盘。内容来自已经 execute 完的 result。

## 下一课

[69-tools-renderers-write.ts.md](/series/pi-source/coding-agent/593-tools-renderers-write-ts/)。
