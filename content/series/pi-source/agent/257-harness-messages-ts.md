---
title: "16 · messages.ts — 给 AgentMessage 加上压缩/分支/bash 角色"
summary: "看懂 declaration merging 如何在不改 types.ts 的情况下扩展 AgentMessage。再看 convertToLlm 怎样把这些角色变成厂家认识的 user。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/messages.ts`  
被谁调用：harness 默认 `toProviderMessages`；`session/context.ts` 把 entry 变成这些角色；compaction 生成摘要时用 prefix/suffix 常量。

## 本课目标

看懂 declaration merging 如何在不改 `types.ts` 的情况下扩展 `AgentMessage`。再看 `convertToLlm` 怎样把这些角色变成厂家认识的 `user`。

## merging

```ts
declare module "../types.ts" {
  interface CustomAgentMessages {
    bashExecution: BashExecutionMessage;
    custom: CustomMessage;
    branchSummary: BranchSummaryMessage;
    compactionSummary: CompactionSummaryMessage;
  }
}
```

主链 `AgentMessage = Message | CustomAgentMessages[...]`。import 过 `messages.ts` 之后，switch `m.role` 必须处理这四个。coding-agent 自己的 session JSONL 也有类似角色，但是产品层类型，不是这份 merging。

## 各角色

- `bashExecution`：命令、输出、exitCode、cancelled、truncated、可选 `fullOutputPath`。`excludeFromContext` 为真则 `convertToLlm` 丢掉。`bashExecutionToText` 拼成「Ran `cmd`」+ fenced output + 退出码/截断提示。
- `custom`：`customType` + content + `display` + details。一律变成 user 文本/图。
- `branchSummary` / `compactionSummary`：包进固定 PREFIX/SUFFIX XML。模型看到的是「到这里为止的历史被摘要了」，不是一条普通聊天。

`create*Message` 接受 number 或 ISO 字符串时间戳。

## `convertToLlm`

user / assistant / toolResult 原样过。default 丢弃。这是 harness 默认的 `toProviderMessages`。宿主可以换成自己的（例如过滤 display:false 的 custom）。

主链 Agent 默认 convertToLlm **不会**做 bashExecution 转换——除非宿主 import 了这份并自己挂上。coding-agent 现行循环用自己的转换。

## 失败与边界

prefix/suffix 是协议的一部分。改文案会让旧会话里已经落盘的摘要和代码里新拼的不一致——落盘的是 entry.summary 原文，每次 `sessionEntryToContextMessages` 现拼包装。改 PREFIX 等于改所有历史会话给模型看的包装。

## 下一课

[17 · system-prompt.ts](/series/pi-source/agent/258-harness-system-prompt-ts/) 只格式化 skills 列表。真正的系统提示字符串由宿主的 `systemPrompt` 选项提供。
