---
title: "23 · components/markdown.ts — 流式 Markdown"
summary: "知道 parser 是模块级单例 Marked，加了严格删除线 tokenizer 和 LaTeX 扩展。流式场景下 trimPartialClosingFences 把未闭合的 切掉，避免半截 code fence 把后面全吞进代码块"
tags: [pi, tui]
---
源码：`packages/tui/src/components/markdown.ts`（约 1015 行）  
被谁调用：交互 transcript 的助手消息。

## 本课目标

知道 parser 是模块级单例 `Marked`，加了严格删除线 tokenizer 和 LaTeX 扩展。流式场景下 `trimPartialClosingFences` 把未闭合的 ` ``` ` 切掉，避免半截 code fence 把后面全吞进代码块。缓存键 `(text, width)`。

## 在系统中的位置

叶子。`setText` 每 token 都可能调用。render 必须快。theme 函数把 heading/code/quote 等变成 ANSI。`highlightCode` 可选，返回已经分行的着色行。

## 要点

- `DefaultTextStyle` 可设默认 fg/bg/bold/italic
- `MarkdownOptions.transform(markdown, availableWidth)` 在 parse 前改源（coding-agent 用来处理特殊块）
- `renderLatex` 默认 true，调 `latex.ts`
- 列表标记可 `preserveOrderedListMarkers`
- 代码块每行前缀默认两个空格

LaTeX tokenizer：找 `$` / `$$`，未闭合且像正在输入则不当数学，留给原文。

## 失败与边界

- marked 的 GFM 删除线太松，所以换了 StrictStrikethroughTokenizer（必须非空白紧贴 `~~`）。
- 超大文档每帧 parse。靠缓存；width 变仍全量。
- 不要在 theme 函数里抛；一行炸会毁整次 render。

## 下一课

[24-components.input.ts.md](/series/pi-source/tui/446-components-input-ts/)：单行输入，Editor 的小兄弟。
