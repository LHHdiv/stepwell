---
title: "76 · utils/text.ts — 从 content 块里拼文字"
summary: "contentText(content, separator = \"\\n\")：字符串原样；数组只保留 type === \"text\" 的 .text。thinking、图片、toolCall 丢掉。这不是给模型看的（模型要完整块），是给"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/text.ts`  
被谁调用：主入口 `export { contentText }`；UI/压缩估计。

`contentText(content, separator = "\n")`：字符串原样；数组只保留 `type === "text"` 的 `.text`。thinking、图片、toolCall 丢掉。这不是给模型看的（模型要完整块），是给人看摘要。

## 下一课

短哈希：[77-utils-hash.ts.md](/series/pi-source/ai/138-utils-hash-ts/)。
