---
title: "105 · utils/clipboard-image.ts — 剪贴板里的图"
summary: "readClipboardImage：macOS pngpaste/osascript、Wayland wl-paste、X11 xclip、Windows PowerShell。返回 { bytes, mimeType }。isWay"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/clipboard-image.ts`

`readClipboardImage`：macOS `pngpaste`/osascript、Wayland `wl-paste`、X11 `xclip`、Windows PowerShell。返回 `{ bytes, mimeType }`。`isWaylandSession` 看 `WAYLAND_DISPLAY`/`XDG_SESSION_TYPE`。`extensionForImageMimeType` 给临时文件名。

InteractiveMode Ctrl+V：有图则写成 tmp 路径插入编辑器（模型侧按路径读），否则退回文本粘贴。

## 失败与边界

没权限、没工具返回 null，调用方静默。不要在 SSH 无剪贴板时弹错误。

## 下一课

[106-utils.mime.ts.md](/series/pi-source/coding-agent/667-utils-mime-ts/)
