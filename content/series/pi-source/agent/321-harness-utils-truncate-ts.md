---
title: "80 · utils/truncate.ts — 行限制与字节限制，谁先到谁赢"
summary: "DEFAULTMAXLINES = 2000，DEFAULTMAXBYTES = 50KiB，GREPMAXLINELENGTH = 500。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/utils/truncate.ts`  
被谁调用：read（head）、bash/output-capture（tail）、grep 行长常量。

## 常量

`DEFAULT_MAX_LINES = 2000`，`DEFAULT_MAX_BYTES = 50KiB`，`GREP_MAX_LINE_LENGTH = 500`。

## `utf8ByteLength`

有 Buffer 用 Buffer；否则手写 UTF-16 码元循环（代理对 4 字节）。截断按字节，不是 JS string.length。

## 结果字段

truncated / truncatedBy lines|bytes / total vs output 行字节 / lastLinePartial（仅 tail 边缘）/ firstLineExceedsLimit（head 第一行就超）。

**head**（read）：尽量整行。第一行超限则 content 空、firstLineExceedsLimit。  
**tail**（bash）：保留末尾；极端时最后一行可 partial（lastLinePartial），因为一行本身大于 50KB。

`formatSize` 给人看。`replaceUnpairedSurrogates` 避免切在代理对中间。

## 失败与边界

空字符串：totalLines 0。内容以 `\n` 结尾不产生额外空行（splitLinesForCounting pop）。调用方必须把 TruncationResult.content 当权威文本，不要自己再 slice。

## 下一课

[81 · adaptive-publisher.ts](/series/pi-source/agent/322-harness-utils-adaptive-publisher-ts/)。
