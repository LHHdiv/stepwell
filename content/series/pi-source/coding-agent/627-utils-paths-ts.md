---
title: "86 · utils/paths.ts — 路径规范化"
summary: "统一 @file、~、Windows Git Bash 路径、file:// URL。不要在业务代码里直接 path.resolve。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/paths.ts`  
谁调用：几乎所有碰文件系统的模块。

## 本课目标

统一 `@file`、`~`、Windows Git Bash 路径、`file://` URL。不要在业务代码里直接 `path.resolve`。

## 函数

- `canonicalizePath`：`realpathSync`，失败（文件还不存在）退回原字符串。
- `getFileRevision`：`dev:ino:size:mtimeNs:ctimeNs`，给热重载判断「是否同一份」。
- `isLocalPath`：不是 `npm:`/`git:`/`http(s):`/`ssh:` 就算本地（`file:` 算本地）。
- `normalizeWindowsShellPath`：`/c/Users`、`/mnt/c/`、`/cygdrive/c/` → `C:\...`。
- `normalizePath`：可选 trim、Unicode 空格、剥 `@`、tilde、file URL。
- `resolvePath`：相对路径相对 `baseDir`（默认 cwd）。
- `getCwdRelativePath`：不在 cwd 内返回 undefined（用这个判断「包是否装在某目录下」，见 managed install）。
- `formatPathRelativeToCwdOrAbsolute`：显示用，分隔符统一 `/`。
- `markPathIgnoredByCloudSync`：macOS xattr / Linux setfattr 写 Dropbox/iCloud ignore。Windows 空操作。

## 失败与边界

tilde 只扩 `~` 和 `~/`。`~otheruser` 不扩。xattr 失败被 spawnSync 忽略。

## 下一课

[87-utils.text.ts.md](/series/pi-source/coding-agent/629-utils-text-ts/)
