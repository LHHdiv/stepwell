---
title: "37 · terminal-image.ts — Kitty / iTerm 协议"
summary: "detectCapabilities() 只看环境变量（TERMPROGRAM、TERM、TMUX…），不探测终端。tmux 下 images=null，超链接仅当 tmux display-message clienttermfeat"
tags: [pi, tui]
---
源码：`packages/tui/src/terminal-image.ts`（约 696 行）

## 本课目标

`detectCapabilities()` 只看环境变量（TERM_PROGRAM、TERM、TMUX…），**不**探测终端。tmux 下 images=null，超链接仅当 `tmux display-message client_termfeatures` 含 hyperlinks。`setCapabilityOverrides` 给测试。

`renderImage(base64, dimensions, options)` → `{ sequence, rows, imageId? }`。Kitty：分块传输、`a=T` 放置、`C=1` 不挪光标。iTerm：OSC 1337。`calculateImageRows` 用 `cellDimensions`（默认 9×18，CSI 16 t 更新）。

`allocateImageId` 单调。`deleteKittyImage` / `deleteAllKittyImages`。`isImageLine` 认协议前缀。`getPng/Jpeg/Gif/WebpDimensions` 读头。`imageFallback` 一行描述。`hyperlink` 包 OSC 8。

## 失败与边界

探测不准：VS Code 内置终端等靠 TERM_PROGRAM 白名单。错了就 fallback 或乱码。tmux 明确关图。

## 下一课

[38-native-platform.ts.md](/series/pi-source/tui/460-native-platform-ts/)：加载 .node。
