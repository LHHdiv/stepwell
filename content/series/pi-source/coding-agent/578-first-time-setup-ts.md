---
title: "62 · first-time-setup.ts — 第一次启动向导"
summary: "无 session。两步键盘：theme 然后 analytics。上下改 index，Enter 下一步/提交，Esc 取消。theme 步每次 update 调 onThemePreview，整对话框 rebuild 以便新颜色立刻"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/first-time-setup.ts`  
谁创建：`cli/startup-ui.ts`（main 在没设置时），不是 InteractiveMode 主循环。

## 订阅什么

无 session。两步键盘：theme 然后 analytics。上下改 index，Enter 下一步/提交，Esc 取消。theme 步每次 update 调 `onThemePreview`，整对话框 rebuild 以便新颜色立刻作用在 logo 上。

## 画什么

边框、像素风 `APP_NAME` logo、Welcome 文案、当前步的选项列表（Dark/Light 或分享匿名数据说明）。

## 失败与边界

取消时调用方应恢复探测到的默认主题。analytics 只写 settings 开关，真正上报见 `core/telemetry.ts`。

## 下一课

[63-show-images-selector.ts.md](/series/pi-source/coding-agent/580-show-images-selector-ts/)
