---
title: "111 · utils/exif-orientation.ts — JPEG 方向"
summary: "applyExifOrientation(photon, image, originalBytes)：从 JPEG EXIF 读 orientation 1–8，用 photon 旋转/翻转，返回可能是新图（调用方要 free 旧图）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/exif-orientation.ts`

`applyExifOrientation(photon, image, originalBytes)`：从 JPEG EXIF 读 orientation 1–8，用 photon 旋转/翻转，返回可能是新图（调用方要 `free` 旧图）。没有 EXIF 或非 JPEG 原样返回。

手机照片不转就会在终端和模型侧「躺着」。

## 下一课

[112-utils.image-convert.ts.md](/series/pi-source/coding-agent/673-utils-image-convert-ts/)
