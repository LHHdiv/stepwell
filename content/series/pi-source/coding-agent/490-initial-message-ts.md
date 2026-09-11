---
title: "18 · initial-message.ts — 非交互第一句从哪拼出来"
summary: "记住拼接顺序和副作用：parsed.messages.shift() 会改 Args。交互模式一般不走这个函数（交互把剩余消息当编辑器预填或直接 prompt，由 main 另一支处理）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/initial-message.ts`  
被谁调用：`main.ts` 在 print/json 路径准备 `session.prompt` 的入参。

## 本课目标

记住拼接顺序和副作用：`parsed.messages.shift()` 会改 Args。交互模式一般不走这个函数（交互把剩余消息当编辑器预填或直接 prompt，由 main 另一支处理）。

## 在系统中的位置

```text
stdin（piped） + processFileArguments + parseArgs.messages
  → buildInitialMessage
  → { initialMessage, initialImages }
runPrintMode: session.prompt(initialMessage, { images: initialImages })
```

函数纯同步、不读盘。文件内容必须已经在 `fileText` / `fileImages` 里。

## `buildInitialMessage`

`parts` 按这个顺序 `join("")`（中间**没有**换行或空格）：

1. `stdinContent`（若 `!== undefined`；空字符串也会占一截）
2. `fileText`
3. `parsed.messages[0]`，然后 `shift()` 掉它

`initialMessage`：parts 全空则 `undefined`（print 模式可能因此立刻结束或报缺 prompt，见 main）。  
`initialImages`：没有图片则为 `undefined`，不是 `[]`。

## 失败与边界

`shift` 是故意的：同一 `parsed` 后面若还有消息，main 可以当后续 prompt 队列。本函数不管那些。stdin 和文件之间无分隔符，用户需要自己在 stdin 末尾留换行。图片只来自 `@file`，不从 stdin 解码。

## 下一课

[19-session-picker.ts.md](/series/pi-source/coding-agent/493-session-picker-ts/)：`--resume` 弹出的会话选择器。
