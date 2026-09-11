---
title: "92 · export-html/tool-renderer.ts — 把 TUI renderer 接到 HTML"
summary: "createToolHtmlRenderer(deps)：对每个 toolCall，找到 ToolDefinition 的 renderCall/renderResult，在离屏 TUI 组件上 render 成文本，再转 HTML。d"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/export-html/tool-renderer.ts`

`createToolHtmlRenderer(deps)`：对每个 toolCall，找到 ToolDefinition 的 renderCall/renderResult，在离屏 TUI 组件上 render 成文本，再转 HTML。deps 提供 theme、cwd、工具表。没有自定义 renderer 返回 undefined，导出用默认 `<pre>`。

不重新 execute 工具。details 来自会话里存的 toolResult。

## 下一课

[93-footer-data-provider.ts.md](/series/pi-source/coding-agent/640-footer-data-provider-ts/)。
