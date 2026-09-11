---
title: "71 · config-selector.ts — `pi config` 资源开关"
summary: "无 session（此时可能根本没有 Runtime）。键盘：Tab 切 global/project 写入范围、在 extensions/skills/prompts/themes 分组里开关、搜索。改完写对应 settings.js"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/config-selector.ts`  
谁创建：`package-manager-cli.handleConfigCommand` → `selectConfig`，**不是**聊天里的 `/settings`。

## 订阅什么

无 session（此时可能根本没有 Runtime）。键盘：Tab 切 global/project 写入范围、在 extensions/skills/prompts/themes 分组里开关、搜索。改完写对应 `settings.json` 的 package 资源过滤。

## 画什么

边框、当前 scope、按 package / 顶层目录分组的资源树，每项 enabled 标记、相对路径。项目未信任时 project 模式不可用。

## 失败与边界

路径来自 `DefaultPackageManager.resolve()` 的两份 ResolvedPaths。开关只影响「是否加载」，不卸载已下载的 git clone。

## 下一课

彩蛋：[72-armin.ts.md](/series/pi-source/coding-agent/598-armin-ts/)
