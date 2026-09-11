---
title: "113 · utils/image-resize-core.ts — 进程内缩放"
summary: "resizeImageInProcess(bytes, { maxDimension, quality })：photon 解码、EXIF、等比缩到 max 边长、再编码。返回 ResizedImage（bytes、宽高、是否缩过）。给"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/image-resize-core.ts`

`resizeImageInProcess(bytes, { maxDimension, quality })`：photon 解码、EXIF、等比缩到 max 边长、再编码。返回 `ResizedImage`（bytes、宽高、是否缩过）。给 worker 和主线程共用，避免两份算法。

## 下一课

[114-utils.image-resize-worker.ts.md](/series/pi-source/coding-agent/675-utils-image-resize-worker-ts/)
