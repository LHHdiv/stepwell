---
title: "106 · utils/mime.ts — 魔数认图"
summary: "detectSupportedImageMimeType(buffer)：看 PNG/JPEG/GIF/WEBP/BMP 头，不认的返回 null。detectSupportedImageMimeTypeFromFile 读文件前几字节"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/mime.ts`

`detectSupportedImageMimeType(buffer)`：看 PNG/JPEG/GIF/WEBP/BMP 头，不认的返回 null。`detectSupportedImageMimeTypeFromFile` 读文件前几字节。给 `@image` 和工具结果图用，不信任扩展名。

## 下一课

[107-utils.html.ts.md](/series/pi-source/coding-agent/668-utils-html-ts/)
