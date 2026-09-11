---
title: "110 · utils/photon.ts — 懒加载图像库"
summary: "loadPhoton() 动态 import @silvia-odwyer/photon-node。失败（可选依赖没装、WASM/原生加载失败）返回 null。所有 resize/convert 必须能在 null 时降级。单例 pro"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/photon.ts`

`loadPhoton()` 动态 import `@silvia-odwyer/photon-node`。失败（可选依赖没装、WASM/原生加载失败）返回 null。所有 resize/convert 必须能在 null 时降级。单例 promise，避免并发 import 两次。

## 下一课

[111-utils.exif-orientation.ts.md](/series/pi-source/coding-agent/672-utils-exif-orientation-ts/)
