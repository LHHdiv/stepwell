---
title: "107 · utils/html.ts — 解码 HTML 实体"
summary: "decodeHtmlEntity(\"amp\"|\"lt\"|...|\"#xNN\"|\"#NN\")。decodeHtmlEntityAt(html, index) 从 & 找到 ;（最长 16），给 highlight.js HTML 转成终端"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/html.ts`

`decodeHtmlEntity("amp"|"lt"|...|"#xNN"|"#NN")`。`decodeHtmlEntityAt(html, index)` 从 `&` 找到 `;`（最长 16），给 highlight.js HTML 转成终端文本时用。非法码点返回 undefined。

## 下一课

[108-utils.highlight-js.d.ts.md](/series/pi-source/coding-agent/669-utils-highlight-js-d-ts/)
