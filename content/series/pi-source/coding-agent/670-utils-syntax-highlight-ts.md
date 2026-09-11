---
title: "109 · utils/syntax-highlight.ts — 终端语法高亮"
summary: "highlight(code, { language }) 用 highlight.js core + 已注册语言，输出 HTML，再 renderHighlightedHtml 配 theme 的 formatter（comment/"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/syntax-highlight.ts`

`highlight(code, { language })` 用 highlight.js core + 已注册语言，输出 HTML，再 `renderHighlightedHtml` 配 theme 的 formatter（comment/keyword/…）和 `decodeHtmlEntity`。`supportsLanguage`。`loadAllHighlightLanguages` 动态 import 全部语言包——InteractiveMode init 末尾后台跑，避免启动卡。

`getLanguageFromPath` 在 theme.ts 也有一份扩展名映射，给代码块围栏缺失时猜语言。

## 失败与边界

未知语言退回无色。ignoreIllegals 避免半截流式代码 throw。

## 下一课

[110-utils.photon.ts.md](/series/pi-source/coding-agent/671-utils-photon-ts/)
