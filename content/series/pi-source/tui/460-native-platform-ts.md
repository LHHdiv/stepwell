---
title: "38 · native-platform.ts — 加载预编译 addon"
summary: "getNativePlatformHelper()：仅 darwin/win32。getNativeClipboard()：非 Linux 转 helper；Linux 要 DISPLAY 且加载 linux-platform-x11."
tags: [pi, tui]
---
源码：`packages/tui/src/native-platform.ts`

## 本课目标

`getNativePlatformHelper()`：仅 darwin/win32。`getNativeClipboard()`：非 Linux 转 helper；Linux 要 `DISPLAY` 且加载 `linux-platform-x11.node`。

路径：`native/<platform>/prebuilds/<platform>-<arch>/<platform>-platform${suffix}.node`。arch 仅 x64/arm64。`cjsRequire` 试 `getNativeModuleCandidates` 的每一候选。成功条件：`getText` 和 `getImage` 都是函数。失败缓存 `undefined`，不重试——但注释说不缓存「显示器不可用」（Linux 每次仍走同一缓存键，DISPLAY 后来出现也不会重载；进程通常一开始就有 DISPLAY）。

`NativeClipboard.setText?`：Linux 没有。

## 失败与边界

standalone 二进制没有 `node_modules/@earendil-works/pi-tui`，靠相对 dist 或 execPath 旁的 native/。见下一课。

## 下一课

[39-native-module-path.ts.md](/series/pi-source/tui/461-native-module-path-ts/)。
