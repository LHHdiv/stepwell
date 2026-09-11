---
title: "68 · settings-submenu.ts — 设置里的子弹窗"
summary: "无 session。SelectSubmenu：可选搜索框 + SelectList，onSelectionChange 给主题预览这类。SteppedSubmenu：多步向导（每步一个 SelectList），用于需要连续问两问的设置"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/settings-submenu.ts`  
谁创建：`SettingsSelectorComponent` 打开某一项。

## 订阅什么

无 session。`SelectSubmenu`：可选搜索框 + `SelectList`，`onSelectionChange` 给主题预览这类。`SteppedSubmenu`：多步向导（每步一个 SelectList），用于需要连续问两问的设置。

## 画什么

标题、说明、列表（当前值预选）。可搜索时顶部 Input。

## 失败与边界

确认回 `value: string`，调用方再 parse 成 boolean/number。Esc 回到设置主列表，不改值。

## 下一课

[69-settings-selector.ts.md](/series/pi-source/coding-agent/592-settings-selector-ts/)
