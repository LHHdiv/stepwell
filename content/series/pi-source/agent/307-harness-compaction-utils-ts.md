---
title: "66 · compaction/utils.ts — 从工具调用抽文件列表，串对话为纯文本"
summary: "FileOperations 三个 Set：read / written / edited。只认助手消息里名为 read/write/edit 且 args.path 为字符串的 toolCall。computeFileLists：mo"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/compaction/utils.ts`

## 文件操作

`FileOperations` 三个 Set：read / written / edited。只认助手消息里名为 read/write/edit 且 args.path 为字符串的 toolCall。`computeFileLists`：modified = edited∪written；readOnly = read - modified。`formatFileOperations` 输出 `<read-files>` / `<modified-files>` 块，附在摘要后给下一模型。

路径是模型当时传入的字符串，未规范化——同一文件相对/绝对路径会算两次。这是启发式，不是 git。

## `serializeConversation`

把 LLM Message[] 打成 `[User]:` / `[Assistant thinking]:` / `[Assistant]:` / `[Assistant tool calls]:` / `[Tool result]:`。tool result 超 2000 字符截断。循环引用 JSON → `[unserializable]`。

## 下一课

[67 · branch-summarization.ts](/series/pi-source/agent/308-harness-compaction-branch-summarization-ts/)。
