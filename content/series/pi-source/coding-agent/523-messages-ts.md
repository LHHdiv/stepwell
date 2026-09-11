---
title: "34 · messages.ts — 产品消息到厂家消息"
summary: "pi-agent-core 的 AgentMessage 可通过 declaration merging 加角色。本文件加上 bashExecution、custom、branchSummary、compactionSummary，并提"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/messages.ts`  
被谁调用：`sdk.ts` 的 `convertToLlm`（再包一层挡图）；压缩 `serializeConversation` 之前；扩展。

## 本课目标

`pi-agent-core` 的 `AgentMessage` 可通过 declaration merging 加角色。本文件加上 `bashExecution`、`custom`、`branchSummary`、`compactionSummary`，并提供 `convertToLlm`：厂家 API 只认识 user/assistant/toolResult。

## 自定义角色

| role | 来源 | convertToLlm |
|---|---|---|
| `bashExecution` | 用户 `!cmd` | 变成 user 文本「Ran \`cmd\`」+ 输出；`excludeFromContext`（`!!`）则丢掉 |
| `custom` | 扩展 `sendMessage` | 当 user，content 原样 |
| `branchSummary` | 树导航 | user，包在 BRANCH_SUMMARY_* 标签里 |
| `compactionSummary` | 压缩条目 | user，包在 COMPACTION_SUMMARY_* 里 |

user/assistant/toolResult 原样返回。switch 有 exhaustive check，新角色必须改这里。

## 和 sdk 挡图的关系

`convertToLlm` **保留 image block**。sdk 的 `convertToLlmWithBlockImages` 在这之后：若设置 `blockImages`，把 image 换成文本 `"Image reading is disabled."`。压缩用的也是本函数，摘要里可能含「图已被挡」之前的真实图片——压缩路径若也要挡图，由调用方再包一层。

## 失败与边界

bash 输出截断时文本里带 `fullOutputPath`，模型可 read 临时文件。custom 的 `display: false` 仍会进 LLM（display 只影响 TUI）。不要在 convertToLlm 里找 JSONL 写入——那是 SessionManager。

## 下一课

[35-model-runtime.ts.md](/series/pi-source/coding-agent/524-model-runtime-ts/)：厂家、凭证、stream 的产品门面。
