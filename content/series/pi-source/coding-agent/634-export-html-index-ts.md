---
title: "90 · export-html/index.ts — 会话导出 HTML"
summary: "读 getExportTemplateDir() 的 template.html/css/js，塞入会话条目、主题色、预渲染的工具 HTML。从 userMessageBg 推背景明暗。ToolHtmlRenderer 由 AgentS"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/export-html/index.ts`  
被谁调用：`/export`、CLI `--export`；`exportFromFile` 读 JSONL 再导出。

读 `getExportTemplateDir()` 的 `template.html/css/js`，塞入会话条目、主题色、预渲染的工具 HTML。从 `userMessageBg` 推背景明暗。`ToolHtmlRenderer` 由 AgentSession 提供，扩展工具才能按 TUI 那样导出。

`exportSessionToHtml` 写文件返回路径。不调模型。vendor 的 highlight.js / marked 随模板走，本课不读压缩过的第三方。

## 下一课

[91-export-html-ansi-to-html.ts.md](/series/pi-source/coding-agent/636-export-html-ansi-to-html-ts/)。
