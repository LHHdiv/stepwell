---
title: "91 · export-html/ansi-to-html.ts — 终端色到 span"
summary: "ansiToHtml / ansiLinesToHtml：把 bash 输出里的 ANSI 变成带 style 的 HTML。导出页才能看见工具输出的红绿。不执行 escape 序列的光标运动，只处理颜色/粗体一类。恶意 ANSI 经 "
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/export-html/ansi-to-html.ts`

`ansiToHtml` / `ansiLinesToHtml`：把 bash 输出里的 ANSI 变成带 style 的 HTML。导出页才能看见工具输出的红绿。不执行 escape 序列的光标运动，只处理颜色/粗体一类。恶意 ANSI 经 HTML escape 文本再套 span。

## 下一课

[92-export-html-tool-renderer.ts.md](/series/pi-source/coding-agent/638-export-html-tool-renderer-ts/)。
