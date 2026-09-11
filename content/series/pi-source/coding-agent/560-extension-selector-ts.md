---
title: "53 · extension-selector.ts — 扩展用的选项列表"
summary: "无 session。handleInput：上下移动、确认、取消、可选 app.tools.expand。timeout 用 CountdownTimer 到期走 onCancel。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/extension-selector.ts`  
谁创建：`ctx.ui.select`、登录方式选择、tree 导航「是否摘要」。

## 订阅什么

无 session。`handleInput`：上下移动、确认、取消、可选 `app.tools.expand`。timeout 用 `CountdownTimer` 到期走 `onCancel`。

## 画什么

边框、强调色标题（可附 `(5s)`）、字符串列表（当前项 `›` + accent）、底栏键位说明。

## 失败与边界

选项是纯 string，没有 description 列。要带搜索/模糊匹配用 `OAuthSelector` 或 `SelectList` 系列。abort signal 由 InteractiveMode 在外层拆组件。

## 下一课

[54-extension-input.ts.md](/series/pi-source/coding-agent/562-extension-input-ts/)
