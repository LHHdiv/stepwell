---
title: "112 · utils/image-convert.ts — 转 PNG"
summary: "Kitty 图形协议要 PNG（f=100）。convertImageBytesToPng 经 photon + EXIF。convertToPng(base64, mime)：已是 png 则短路。photon 不可用或失败返回 nu"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/image-convert.ts`

Kitty 图形协议要 PNG（f=100）。`convertImageBytesToPng` 经 photon + EXIF。`convertToPng(base64, mime)`：已是 png 则短路。photon 不可用或失败返回 null，调用方改用占位文本。

## 下一课

[113-utils.image-resize-core.ts.md](/series/pi-source/coding-agent/674-utils-image-resize-core-ts/)
