---
title: "77 · compaction/utils.ts — 摘要用的会话序列化"
summary: "extractFileOpsFromMessage：assistant 的 toolCall 里 path + name 为 read/write/edit。computeFileLists：只读 vs 改过。formatFileOpe"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/compaction/utils.ts`

## 文件操作

`extractFileOpsFromMessage`：assistant 的 toolCall 里 `path` + name 为 read/write/edit。`computeFileLists`：只读 vs 改过。`formatFileOperations` 变成 XML 贴在摘要后，方便压缩后模型知道碰过哪些文件。

## `serializeConversation`

把厂家 Message 打成 `[User]:` / `[Assistant]:` / `[Assistant tool calls]:` / `[Tool result]:`。tool result 限 2000 **字符**。目的：摘要模型不要以为自己在接着聊天，也不要把整份 bash 输出再吃一遍。

调用方必须先 `convertToLlm`。图片变成 convert 后的形态（或挡图文本）。

`SUMMARIZATION_SYSTEM_PROMPT` 强制只输出结构化摘要。

## 下一课

[78-compaction-branch-summarization.ts.md](/series/pi-source/coding-agent/610-compaction-branch-summarization-ts/)。
