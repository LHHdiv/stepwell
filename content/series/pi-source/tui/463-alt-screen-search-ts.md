---
title: "41 · alt-screen-search.ts — 视口内搜索语料"
summary: "把已经画好的行（含 ANSI）变成可搜索的纯文本，并记下每个子串对应的 (row, startCol, endCol)，高亮时才能画回视口。ASCII 快路径按空格切开整段索引；非 ASCII 走 grapheme。行间插入一个空格当分"
tags: [pi, tui]
---
源码：`packages/tui/src/alt-screen-search.ts`  
被谁调用：`TuiAltScreen` 开 `/` 搜索。

## 本课目标

把已经画好的行（含 ANSI）变成可搜索的纯文本，并记下每个子串对应的 `(row, startCol, endCol)`，高亮时才能画回视口。ASCII 快路径按空格切开整段索引；非 ASCII 走 grapheme。行间插入一个空格当分隔，避免跨行粘词误匹配。

`Input` 当查询框。匹配大小写：对着实现看是否敏感（语料 lower？）。返回 `AltScreenSearchMatch[]`，每项可多 segment（跨行）。

## 失败与边界

只搜**当前 render 出的文档行**，不是磁盘文件。超大 transcript 建 corpus 有 bench：`alt-screen-large-transcript-bench.ts`。改算法先跑它。

## 下一课

[42-components.alt-screen-flash.ts.md](/series/pi-source/tui/464-components-alt-screen-flash-ts/)。
