---
title: "66 · tools/render-utils.ts — 工具 TUI 的公共绘制"
summary: "shortenPath：home → ~。 linkPath：终端支持超链接则 file://。 str：非 string 且非 nullish → null（渲染成 invalid arg）。 replaceTabs：tab → 三空"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/render-utils.ts`  
被谁调用：各 `renderers/*.ts`。不执行工具。

## 函数

`shortenPath`：home → `~`。  
`linkPath`：终端支持超链接则 `file://`。  
`str`：非 string 且非 nullish → `null`（渲染成 invalid arg）。  
`replaceTabs`：tab → 三空格。  
`getTextOutput`：拼 text block，剥 ANSI/二进制；图在终端不支持或用户关掉时变 fallback 尺寸文字。  
`renderToolPath`：强调色 + 短路径 + 超链接；参数不是字符串则 `[invalid arg]`。

这些只影响 TUI。模型看到的是 execute 返回的 content，不是这里的样式。

## 下一课

[67-tools-renderers-index.ts.md](/series/pi-source/coding-agent/588-tools-renderers-index-ts/)。
