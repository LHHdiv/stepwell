---
title: "45 · mermaid.ts — 把 mermaid 代码块画成终端图"
summary: "无 session。每次 Markdown transform 读 settingsManager.getMermaidRenderingMode()：off 原样；streaming 才在流式时渲染；默认只在定稿后渲染。thinkin"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/mermaid.ts`  
谁创建：InteractiveMode 字段 `mermaidMarkdownTransformer`，塞进 Markdown transformers。

## 订阅什么

无 session。每次 Markdown transform 读 `settingsManager.getMermaidRenderingMode()`：`off` 原样；`streaming` 才在流式时渲染；默认只在定稿后渲染。thinking 块永不渲染。

## 画什么

用 `Marked.lexer` 找 ` ```mermaid `。`grok-mermaid` 的 `render` 得到 ASCII art。宽度超过 `availableWidth` 则保留源码。成功则每行包成 code span（保护盒线字符和空格），span 按 cls 上 theme 色（border/text/edge/title）。有 warning 时在图下加 warning 色说明。

## 失败与边界

lexer 只处理顶层 token，引用块里的 mermaid 不会转。渲染失败或过宽静默回退源码。

## 下一课

[46-visual-truncate.ts.md](/series/pi-source/coding-agent/547-visual-truncate-ts/)
