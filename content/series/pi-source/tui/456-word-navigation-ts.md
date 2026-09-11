---
title: "34 · word-navigation.ts — 按词移动"
summary: "纯函数 findWordBackward/Forward(text, cursor, options?)。默认 Intl.Segmenter word。先跳空白，再跳一个 word-like（内部 ASCII 标点再切）或一串标点。is"
tags: [pi, tui]
---
源码：`packages/tui/src/word-navigation.ts`

## 本课目标

纯函数 `findWordBackward/Forward(text, cursor, options?)`。默认 `Intl.Segmenter` word。先跳空白，再跳一个 word-like（内部 ASCII 标点再切）或一串标点。`isAtomicSegment` 让 paste marker 一次跨过。

Editor 传入自定义 `segment`（marker 感知）。不要用空格 split——CJK 没有空格。

## 失败与边界

`cursor` 是 UTF-16 下标。非法 cursor 夹到 [0, length]。空 options 用模块级 wordSegmenter。

## 下一课

[35-latex.ts.md](/series/pi-source/tui/457-latex-ts/)。
