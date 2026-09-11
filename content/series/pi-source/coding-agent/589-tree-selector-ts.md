---
title: "67 · tree-selector.ts — /tree 会话树"
summary: "无 session 订阅。数据是构造时的 getTree() 快照。键盘：上下、左右水平平移、过滤模式循环（default / no-tools / user-only / labeled-only / all）、确认导航、Esc 取消"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/tree-selector.ts`（约 1300 行）  
谁创建：`showTreeSelector`。

## 订阅什么

无 session 订阅。数据是构造时的 `getTree()` 快照。键盘：上下、左右水平平移、过滤模式循环（default / no-tools / user-only / labeled-only / all）、确认导航、Esc 取消、给节点加 label、复制选中文本（`onCopy`）。

## 画什么

用 `├─` / `└─` / gutter `│` 展平树。每节点一行：角色色、截断文本、可选 label。当前 leaf 高亮。水平 viewport：树 gutter 钉住，行体平移让选中行的「正文锚点」落在可见区（太深的 indent 否则只看见线）。过滤器藏工具结果等噪音。

## 失败与边界

选当前 leaf 是 no-op。真正 `navigateTree`、是否摘要，在 InteractiveMode 关掉选择器之后问。label 通过回调写 session jsonl，本组件不直接碰 SessionManager。

## 下一课

[68-settings-submenu.ts.md](/series/pi-source/coding-agent/590-settings-submenu-ts/)
