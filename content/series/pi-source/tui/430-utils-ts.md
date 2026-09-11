---
title: "08 · utils.ts — 可见宽度与 ANSI 切片"
summary: "记住：终端列数 ≠ string.length。CJK 2 列、emoji 2 列、ANSI 0 列、组合标记 0 列。所有截断必须走 truncateToWidth / sliceByColumn，否则差量渲染会把行画歪。"
tags: [pi, tui]
---
源码：`packages/tui/src/utils.ts`（约 1337 行）  
被谁调用：几乎每个组件和两个 Screen。

## 本课目标

记住：终端列数 ≠ `string.length`。CJK 2 列、emoji 2 列、ANSI 0 列、组合标记 0 列。所有截断必须走 `truncateToWidth` / `sliceByColumn`，否则差量渲染会把行画歪。

## 在系统中的位置

```text
component.render(width)
  wrapTextWithAnsi / truncateToWidth / visibleWidth
TuiMainScreen 比行、composite overlay
  extractSegments / sliceWithWidth / sliceByColumn
```

共享 `Intl.Segmenter` grapheme / word，经 `getGraphemeSegmenter` / `getWordSegmenter` 导出，避免每组件 new 一次。

## 宽度

`visibleWidth`：剥 CSI/OSC 后按 grapheme。ASCII 快路径 length。非 ASCII 走 east-asian-width + RGI emoji 启发式（先 `couldBeEmoji` 再贵的 `\p{RGI_Emoji}`）。512 条 LRU 缓存。

零宽：Default_Ignorable、Control、Mark、Surrogate。例外：部分 spacing mark 终端仍占格，`terminalSpacingMarkRegex` 把它们算进去。

Tab：按上下文扩到空格（组件常先把 `\t` 换成 3 空格）。

## 切片

`sliceByColumn(text, startCol, width, pad?)`：按可见列切，保留 ANSI，必要时补空格。半个双宽字符用空格代替，不要把 CJK 切成一半。

`truncateToWidth(text, max, ellipsis="...")`：切完加省略号，省略号自己也占宽。

`wrapTextWithAnsi`：按宽换行，ANSI 状态在行间重放。CJK 可在字边界断（`cjkBreakRegex`）。

`extractSegments`：overlay 合成用，一次切 before/middle/after。

`stripTerminalSequences`：搜索语料、选区文本。

`getOsc8LinkAtColumn`：点链接。

`applyBackgroundToLine`：用 bgFn 包整行并 pad。

## 失败与边界

- 区域指示符（国旗）宽度有回归测试。改启发式先跑 `regression-regional-indicator-width`。
- OSC 8 未闭合会让后续宽度计算含进链接里。组件应成对输出。
- `visibleWidth` 不理解 Kitty 图形序列；图像行必须先 `isImageLine` 短路。

## 下一课

组件从叶子开始：[09-components.text.ts.md](/series/pi-source/tui/431-components-text-ts/)。
