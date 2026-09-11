---
title: "60 · tools/truncate.ts — 工具输出的行/字节闸门"
summary: "两套独立上限，先到先停：DEFAULTMAXLINES = 2000，DEFAULTMAXBYTES = 50KiB。尽量不返回半行（bash tail 在「第一行就超字节」时例外）。这与 agent-loop 因 stopReason"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/truncate.ts`  
被谁调用：read（head）、bash/powershell（tail）、grep/find/ls（head 只限字节）、OutputAccumulator。

## 本课目标

两套独立上限，先到先停：`DEFAULT_MAX_LINES = 2000`，`DEFAULT_MAX_BYTES = 50KiB`。**尽量不返回半行**（bash tail 在「第一行就超字节」时例外）。这与 agent-loop 因 `stopReason===length` 拒绝执行工具是不同层。

## `truncateHead`

从文件头留。首行字节已 > maxBytes → `content=""`，`firstLineExceedsLimit=true`。否则逐行累加，一行放不下就停，不切行。

## `truncateTail`

从文件尾留。若连最后一行都超 maxBytes，从该行**末尾**按 UTF-8 边界切（`truncateStringToBytesFromEnd` 跳过 continuation byte），`lastLinePartial=true`。

空字符串：`splitLinesForCounting` 得 0 行。末尾换行不记额外空行。

## `truncateLine`

按**字符数**（不是字节）切，默认 500，后缀 `... [truncated]`。给 grep。

## `TruncationResult`

`truncated` / `truncatedBy: "lines"|"bytes"|null` / 总行字节 / 输出行字节 / 两个 flag / 当时的 max 值。工具把需要的字段放进 `details`，并在 content 文本里写人话 continuation。

## 和 executeToolCalls 的关系

truncate 发生在 `execute` **内部**，成功 toolResult 已经是砍过的。loop 看不到 TruncationResult，只看到 content。模型靠文本里的 `offset=` / `Full output:` 继续。不要指望 loop 做二次截断。

## 下一课

[61-tools-path-utils.ts.md](/series/pi-source/coding-agent/576-tools-path-utils-ts/)。
