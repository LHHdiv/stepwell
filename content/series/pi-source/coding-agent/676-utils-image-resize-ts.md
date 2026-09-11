---
title: "115 · utils/image-resize.ts — 对外缩放 API"
summary: "resizeImage：能开 worker 就开，失败回退进程内。formatDimensionNote 给「已从 4000×3000 缩到 1568×…」这类提示。SDK 再导出。设置 autoResizeImages 时 promp"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/image-resize.ts`

`resizeImage`：能开 worker 就开，失败回退进程内。`formatDimensionNote` 给「已从 4000×3000 缩到 1568×…」这类提示。SDK 再导出。设置 `autoResizeImages` 时 prompt 附带图片会走这里，省上下文。

## 下一课

[116-utils.image-process.ts.md](/series/pi-source/coding-agent/677-utils-image-process-ts/)
