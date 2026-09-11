---
title: "61 · trust-selector.ts — /trust 项目信任"
summary: "无 session。上下选择 getProjectTrustOptions(cwd) 给出的项（信任本目录 / 信任父路径 / 不信任等），确认回 { trusted, updates }。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/trust-selector.ts`  
谁创建：`showTrustSelector`。

## 订阅什么

无 session。上下选择 `getProjectTrustOptions(cwd)` 给出的项（信任本目录 / 信任父路径 / 不信任等），确认回 `{ trusted, updates }`。

## 画什么

标题 Project trust、cwd、已保存决策（含 inherited from）、当前 session 是否 trusted、选项列表、键位。

## 失败与边界

改的是 `ProjectTrustStore`。提示里写重启后项目资源才生效——当前进程的 `settingsManager.setProjectTrusted` 由调用方同步。

## 下一课

[62-first-time-setup.ts.md](/series/pi-source/coding-agent/578-first-time-setup-ts/)
