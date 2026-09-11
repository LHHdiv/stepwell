---
title: "29 · stdin-buffer.ts — 拆完整序列"
summary: "stdin 'data' 可能把 ESC [ < 35 ; 20 ; 5 m 拆成三截，或把两次按键粘成一块。Buffer 累积到 isCompleteSequence，再 emit 'data'。bracketed paste 整段 "
tags: [pi, tui]
---
源码：`packages/tui/src/stdin-buffer.ts`  
被谁调用：只 `ProcessTerminal.setupStdinBuffer`。

## 本课目标

stdin `'data'` 可能把 `ESC [ < 35 ; 20 ; 5 m` 拆成三截，或把两次按键粘成一块。Buffer 累积到 `isCompleteSequence`，再 emit `'data'`。bracketed paste 整段 emit `'paste'`。

## 分类

- CSI `ESC [` … 终字节 `@-~`；SGR 鼠标要 `<b;x;yM/m`；旧鼠标 `ESC[M` + 3 字节
- OSC `ESC ]` … BEL 或 ST
- DCS `ESC P` … ST（XTVersion）
- APC `ESC _` … ST（Kitty 图回复）
- SS3 `ESC O` + 一字符
- 单独 ESC：等 `escapeTimeout`（见 terminal.ts）再当 Escape；期间来了下一字节当 Alt 或 CSI 前缀

非 ESC：按字符吐可打印，控制字符单独。

超时：不完整序列等 `sequenceTimeout`（默认 50ms）后强制 flush，避免永远等。

基于 OpenTUI，MIT。

## 失败与边界

- 超时 flush 半截 CSI：下游当未知键。宁可误触也不要卡住。
- paste 极大：整段进内存。Editor 再决定是否变 marker。
- `destroy()` 清 timer。ProcessTerminal.stop 必须调。

## 下一课

[30-autocomplete.ts.md](/series/pi-source/tui/452-autocomplete-ts/)。
