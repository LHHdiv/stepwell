---
title: "35 · latex.ts — 数学转 Unicode"
summary: "这不是 TeX 引擎。宏名表映射到 Unicode 符号（\\alpha→α，\\sum→∑），再处理上标/下标/分数的有限子集。失败则退回源文本。目标是 transcript 里的短公式可读，不是排版论文。"
tags: [pi, tui]
---
源码：`packages/tui/src/latex.ts`（约 1394 行）  
被谁调用：Markdown `renderLatex`。

## 本课目标

这不是 TeX 引擎。宏名表映射到 Unicode 符号（`\alpha`→α，`\sum`→∑），再处理上标/下标/分数的有限子集。失败则退回源文本。目标是 transcript 里的短公式可读，不是排版论文。

`renderLatex(source, options?)` 入口。内部递归解析 `{...}`、`^` `_`。`visibleWidth` 用来在终端里对齐分数线这类尝试。

## 失败与边界

未知宏、过深嵌套、不支持的环境：返回尽量多的原文。不要 throw 进 Markdown render。矩阵/对齐环境基本不行。

## 下一课

[36-terminal-colors.ts.md](/series/pi-source/tui/458-terminal-colors-ts/)。
