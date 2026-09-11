---
title: "54 · edit-tool-stats.mjs — 编辑调用为什么失败、payload 膨胀了几倍"
summary: "最长公共前缀 + 剩余部分最长公共后缀，中间当 core。算出："
tags: [pi, root]
---
源码：`scripts/edit-tool-stats.mjs`  
被谁调用：改 `packages/coding-agent/src/core/tools/edit.ts` 前后，用真实会话看「exact text not found」是不是主因。默认 `--auto-since-path` 是 `~/.pi/agent/extensions/edit.ts` 的 birthtime——维护者若用扩展覆盖了 edit，只统计扩展诞生之后的调用，避免和旧实现混在一张表。

## 本课目标

盯住两个算法：

### 1. `analyzeReplacement(oldText, newText)`

最长公共前缀 + 剩余部分最长公共后缀，中间当 core。算出：

- 共享上下文字节 vs 真正改动的 core 字节
- `inflationRatio = totalEditBytes / coreBytes`（core 为 0 则 no-core-change）

用来抓「模型为了改一行把整个文件当 oldText/newText 送回来」——上下文和失败率都会炸。

### 2. `classifyErrorKind`

从 toolResult 文本分类：file_not_found、not_found_exact_text、multiple_occurrences、no_changes_made、invalid_input、overlapping_edits、aborted、missing_result、other。这些字符串必须和 `edit.ts` 的错误文案保持同步，否则全掉进 other。

`getArgStyle` 区分 API 年代：`edits[]`、`oldText/newText`、`old_string/new_string`、mixed。迁移参数名时用它看旧会话还剩多少。

## 文件做什么

readline 扫 JSONL，配对 toolCall/toolResult（与 tool-stats 相同）。`--failed-only`、`--model`、`--ext`、`--top`、`--json`、`--include-records`。默认人类可读报告 + top 例。

`--all-sessions` 关掉 auto-since。`--since` ISO 优先于 birthtime。

扩展名：`path.extname`，点文件无其它点则当整个 basename。

## 关键逻辑

失败会怎样：

- auto-since 路径不存在：`resolveAutoSinceMs` 返回 null，等于扫全部——可能把你以为过滤掉的旧失败算进来
- 错误文案改了没改本脚本：趋势图假性好转
- JSON 报告含 `--include-records` 会把 oldText 全文倒出：不要分享
- 不进 CI：edit 工具的单测在 packages/coding-agent/test；本脚本是生产质量信号

## 和启动链的关系

无。edit 工具在循环的 `executeToolCalls` 里跑；本课读它留下的痕迹，用来决定要不要改匹配算法或截断策略。

## 下一课

家族最后一员，read 工具：[55-read-tool-stats.mjs.md](/series/pi-source/root/059-read-tool-stats-mjs/)。
