---
title: "108 · utils/highlight-js.d.ts — 按需语言的类型补丁"
summary: "官方 @types 对 highlight.js/lib/core.js 和 lib/languages/.js 不完整。本文件 declare module，让 syntax-highlight.ts 能 import 单个语言工厂而"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/highlight-js.d.ts`

官方 `@types` 对 `highlight.js/lib/core.js` 和 `lib/languages/*.js` 不完整。本文件 declare module，让 `syntax-highlight.ts` 能 import 单个语言工厂而不拉进整个 highlight.js。

无运行时。

## 下一课

[109-utils.syntax-highlight.ts.md](/series/pi-source/coding-agent/670-utils-syntax-highlight-ts/)
