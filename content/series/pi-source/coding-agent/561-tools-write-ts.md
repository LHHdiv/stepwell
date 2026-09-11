---
title: "53 · tools/write.ts — 创建或覆盖文件"
summary: "snippet：Create or overwrite files；guideline：只用于新文件或整文件重写（局部改用 edit）。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/write.ts`  
被谁调用：默认四件套之一。

## schema

- `path` string
- `content` string（整份文件）

snippet：`Create or overwrite files`；guideline：只用于新文件或整文件重写（局部改用 edit）。

## execute 副作用

`resolveToCwd`（**不用** read 的 Unicode 变体，写路径以用户/模型给的为准）→ `withFileMutationQueue(absolutePath)`：

1. `ops.mkdir(dirname, recursive)`
2. `ops.writeFile` UTF-8 **覆盖**

成功文本：`Successfully wrote to ${path}`（原 path 字符串，不是绝对路径）。

abort：**不**在 listener 里 reject。注释写明：reject 会释放队列，而 in-flight write 仍可能完成，造成队列以为没事、实际还在写。改为每个 await 之后 `throwIfAborted()`。abort 时若 write 已发出，文件可能已是新内容。

## 截断

**不截断写入内容，也不截断成功消息。** 模型若把巨大 content 塞进 toolCall，JSON 本身可能先被厂家 length 截断 → loop 不执行。已执行则整份写入。

## 和 executeToolCalls 的关系

write 未标 `executionMode: sequential`。并行批里两个 write **同一文件** 由 mutation queue 串行（key 是 realpath，ENOENT 则用 resolve 路径）。不同文件并行。与 edit 同文件也进同一队列。

扩展 beforeToolCall 可在 mkdir 前拦住。schema 失败（缺 path）不碰盘。

## 下一课

[54-tools-edit.ts.md](/series/pi-source/coding-agent/563-tools-edit-ts/)。
