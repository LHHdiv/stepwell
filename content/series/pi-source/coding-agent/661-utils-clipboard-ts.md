---
title: "103 · utils/clipboard.ts — 读写剪贴板文本"
summary: "readClipboardText / copyToClipboard 按平台调 pbcopy/pbpaste、wl-copy/xclip、Windows clip / PowerShell。底层 runClipboardCommand"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/clipboard.ts`

`readClipboardText` / `copyToClipboard` 按平台调 `pbcopy`/`pbpaste`、`wl-copy`/`xclip`、Windows `clip` / PowerShell。底层 `runClipboardCommand`。SDK 再导出 `copyToClipboard`。

失败 throw 或返回 null，调用方（粘贴、/copy、划选）各自决定是否 showError。

## 下一课

[104-utils.clipboard-command.ts.md](/series/pi-source/coding-agent/663-utils-clipboard-command-ts/)
