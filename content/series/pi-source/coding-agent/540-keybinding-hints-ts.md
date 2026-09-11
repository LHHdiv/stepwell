---
title: "43 · keybinding-hints.ts — 把绑定渲染成提示文案"
summary: "无。读 tui 全局 getKeybindings().getKeys(keybinding)。InteractiveMode 构造时 setKeybindings 过，所以这里拿到的是用户 keybindings.json。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/keybinding-hints.ts`  
谁调用：header、各选择器 footer、status 文案。

## 订阅什么

无。读 tui 全局 `getKeybindings().getKeys(keybinding)`。InteractiveMode 构造时 `setKeybindings` 过，所以这里拿到的是用户 `keybindings.json`。

## 画什么

不画组件。返回染色字符串：

- `formatKeyText("ctrl+c/ctrl+d")` → `ctrl+c/ctrl+d`，macOS 把 `alt` 显示成 `option`。
- `keyText("app.interrupt")` — 当前绑定，小写。
- `keyDisplayText` — 首字母大写，给按钮标签。
- `keyHint(binding, "to interrupt")` — dim 键 + muted 说明。
- `rawKeyHint("/", "for commands")` — 键不是 Keybinding 名，是字面量。

## 失败与边界

绑定被用户删空时 `keyText` 返回 `""`，hint 会变成只有说明，调用方应用 `cycleKeys.length > 0` 判断（见 init 的 model scope 提示）。

## 下一课

[44-markdown-transform.ts.md](/series/pi-source/coding-agent/543-markdown-transform-ts/)
