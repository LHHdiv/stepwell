---
title: "27 · keys.ts — 原始字节对 KeyId"
summary: "matchesKey(data, \"ctrl+c\") 必须同时认：传统 \\x03、Kitty CSI u、modifyOtherKeys。能指出 setKittyProtocolActive 与 ProcessTerminal 协商同步"
tags: [pi, tui]
---
源码：`packages/tui/src/keys.ts`（约 1401 行）

## 本课目标

`matchesKey(data, "ctrl+c")` 必须同时认：传统 `\x03`、Kitty CSI u、modifyOtherKeys。能指出 `setKittyProtocolActive` 与 ProcessTerminal 协商同步。`parseKey` 把未知序列变成可读名字，给 key tester 用。

## 在系统中的位置

```text
StdinBuffer 吐出一条序列
  matchesKey / isKeyRelease / decodeKittyPrintable / decodePrintableKey
KeybindingsManager.matches → matchesKey
```

`Key` 辅助对象：`Key.ctrl("c")` 等，类型是模板字符串 KeyId。

## Kitty CSI u

`CSI <codepoint> ; <mod> ; ... u`。flags 含事件类型时 `;1:3` 这种是 release。`isKeyRelease` / `isKeyRepeat` 解析 event type。功能键有等价 codepoint 表（normalize）。Shift+字母用 base layout key。

Caps/Num lock 在 LOCK_MASK，比较时忽略，避免「开了 Caps 所有快捷键失效」。

## 传统序列

`LEGACY_KEY_SEQUENCES`：箭头、F 键、Home… 含 SS3 `ESC O A`。Shift/Ctrl 变体另表。Windows Terminal 对 Backspace 有特殊匹配。

`rawCtrlChar("c")` → `\x03`。仅 Kitty 未激活时走这条，避免和 CSI u 双匹配。

## `decodeKittyPrintable`

只把「带 shift 的可打印 CSI u」译回字符，给 Editor 插入。其它修饰不译，留给快捷键。

`decodePrintableKey` 再加 modifyOtherKeys 可打印。

## 失败与边界

- 未知序列 `matchesKey` false，Editor 可能当没有输入。粘贴不该走 matchesKey。
- Super 键依赖协议。macOS Terminal.app 常常没有。
- `parseKeyId` 失败（拼错 "ctr+c"）→ matchesKey false。

## 下一课

[28-keybindings.ts.md](/series/pi-source/tui/450-keybindings-ts/)：动作名到 KeyId 的表。
