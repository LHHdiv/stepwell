---
title: "91 · utils/ansi.ts — 剥 ANSI"
summary: "派生自 chalk 的 ansi-regex/strip-ansi。匹配 OSC（ESC ] ... ST）和 CSI。stripAnsi：非 string throw；快速路径没有 ESC/C1 则原样返回。bash 输出进组件前必须"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/ansi.ts`

派生自 chalk 的 ansi-regex/strip-ansi。匹配 OSC（`ESC ] ... ST`）和 CSI。`stripAnsi`：非 string throw；快速路径没有 ESC/C1 则原样返回。bash 输出进组件前必须剥，否则宽度计算和 Markdown 被控制序列打乱。

## 下一课

[92-utils.deprecation.ts.md](/series/pi-source/coding-agent/639-utils-deprecation-ts/)
