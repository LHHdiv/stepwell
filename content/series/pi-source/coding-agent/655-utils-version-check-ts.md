---
title: "100 · utils/version-check.ts — 有没有新的 pi"
summary: "getLatestPiRelease(current, { retry }) 打安装器 API，返回 { version, packageName?, note? }。comparePackageVersions / isNewerPa"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/version-check.ts`

`getLatestPiRelease(current, { retry })` 打安装器 API，返回 `{ version, packageName?, note? }`。`comparePackageVersions` / `isNewerPackageVersion` 处理预发布。`checkForNewPiVersion` 给 TUI 通知。`formatVersionCheckError` 把 abort/网络收成短句。

`PI_OFFLINE` 时调用方根本不进这里。失败不应抛到交互主循环——`run()` 里 `.then` 没有强制 catch 到 showError，内部应吞掉或返回 undefined。

## 下一课

[101-utils.management-http.ts.md](/series/pi-source/coding-agent/657-utils-management-http-ts/)
