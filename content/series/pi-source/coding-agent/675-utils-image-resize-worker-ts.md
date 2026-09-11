---
title: "114 · utils/image-resize-worker.ts — worker_thread 入口"
summary: "worker 收到 { bytes, options }，调 resizeImageInProcess，把结果 postMessage 回去。把 CPU 重的解码移出 TUI 线程，避免粘贴大图时输入卡顿。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/image-resize-worker.ts`

worker 收到 `{ bytes, options }`，调 `resizeImageInProcess`，把结果 postMessage 回去。把 CPU 重的解码移出 TUI 线程，避免粘贴大图时输入卡顿。

## 下一课

[115-utils.image-resize.ts.md](/series/pi-source/coding-agent/676-utils-image-resize-ts/)
