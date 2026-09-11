---
title: "58 · theme-selector.ts — 主题列表"
summary: "无 session。SelectList.onSelectionChange → onPreview(name)，InteractiveMode 调 themeController.preview，移动即换肤。确认才 persist；取"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/theme-selector.ts`  
谁创建：设置里的 Theme 项。

## 订阅什么

无 session。`SelectList.onSelectionChange` → `onPreview(name)`，InteractiveMode 调 `themeController.preview`，**移动即换肤**。确认才 persist；取消要调用方再 apply 回原来的 setting。

## 画什么

边框 + 主题名列表，当前项 description `(current)`。

## 失败与边界

列表来自 `getAvailableThemes()`，含内置、用户目录、扩展。预览失败（坏 JSON）由 controller 落 dark 并 showError。

## 下一课

[59-oauth-selector.ts.md](/series/pi-source/coding-agent/572-oauth-selector-ts/)
