---
title: "96 · pi-manifest.ts — package.json 里的 `\"pi\"` 字段"
summary: "readPiManifest(packageJsonPath)：读 pkg.pi.extensions|skills|prompts|themes，必须是 string[]。失败或没有 pi 对象返回 null。扩展发现和包管理都靠它声"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/pi-manifest.ts`

`readPiManifest(packageJsonPath)`：读 `pkg.pi.extensions|skills|prompts|themes`，必须是 string[]。失败或没有 `pi` 对象返回 null。扩展发现和包管理都靠它声明入口，而不是约定扫全部 js。

## 下一课

[97-radius.ts.md](/series/pi-source/coding-agent/648-radius-ts/)。
