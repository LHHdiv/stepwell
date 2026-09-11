---
title: "116 · utils/image-process.ts — 进模型前的图"
summary: "processImage(bytes, mime, { autoResizeImages })：先把 mime 收到 png/jpeg/gif/webp；不支持则转 PNG。然后可选 resize。成功 { ok, data: base"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/image-process.ts`

`processImage(bytes, mime, { autoResizeImages })`：先把 mime 收到 png/jpeg/gif/webp；不支持则转 PNG。然后可选 resize。成功 `{ ok, data: base64, mimeType, hints[] }`（含「converted from…」「resized from…」）。失败 `{ ok:false, message }`。

read 工具和 `@file` 走这里。hints 会进会话，让模型知道图被处理过。

## 下一课

[117-utils.tool-result-images.ts.md](/series/pi-source/coding-agent/678-utils-tool-result-images-ts/)
