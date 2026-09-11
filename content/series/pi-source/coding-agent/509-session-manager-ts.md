---
title: "27 · session-manager.ts — JSONL 会话树"
summary: "把磁盘格式和内存树对齐。读完应能指出：header 与 entry 的区别、leaf 如何前进、压缩如何改「送给模型的路径」、为什么没出现过 assistant 之前文件可能还是空的。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/session-manager.ts`（约 1700 行）  
被谁调用：`main` 创建；`sdk.ts` / `AgentSession` 在每次消息结束时 `append*`；`--resume` 列表；压缩与 fork。

## 本课目标

把磁盘格式和内存树对齐。读完应能指出：header 与 entry 的区别、leaf 如何前进、压缩如何改「送给模型的路径」、为什么没出现过 assistant 之前文件可能还是空的。

## 在系统中的位置

```text
createSessionManager(cwd, sessionFile?)
  读 JSONL → fileEntries + byId + leafId
AgentSession.subscribe
  message_end / model_change / compaction
    sessionManager.appendMessage / appendCompaction / ...
sdk createAgentSession
  sessionManager.buildSessionContext() → 恢复 Agent.state.messages
```

文件是 append-only JSONL。树靠每条 `id` / `parentId`，不是靠数组下标。分支 = 把 leaf 拨到祖先，再 append 新孩子。

## 磁盘格式

第一行（或某行）`type: "session"` 是 **header**：`id`、`timestamp`、`cwd`、`version`（当前 3）、可选 `parentSession`。

其余是 `SessionEntry`，都有 `id`、`parentId`、`timestamp`：

| type | 进 LLM 上下文？ | 作用 |
|---|---|---|
| `message` | 是（消息本身） | user/assistant/toolResult/bashExecution/custom |
| `custom_message` | 是（变 custom AgentMessage） | 扩展注入 |
| `compaction` | 是（变成 compactionSummary） | 摘要 + firstKeptEntryId |
| `branch_summary` | 是 | 离开某分支时的摘要 |
| `model_change` | 否（只恢复当前模型） | provider + modelId |
| `thinking_level_change` | 否 | 思考等级 |
| `custom` | 否 | 扩展私有状态 |
| `label` | 否 | 书签 |
| `session_info` | 否 | 显示名 |

`buildSessionContext` 只沿 **当前 leaf 到根** 的路径走，再用最新 compaction 丢掉已摘要的前缀。

## 延迟写盘 `_persist`

没有 assistant 消息时：若尚未 flushed，append **不写文件**（`flushed=false`）。第一条 assistant 到来时用 `"wx"` 一次性写出全部行（文件必须还不存在）。之后 `appendFileSync`。

意图：用户打开 TUI 又立刻退出，磁盘上不要留下空会话。一旦模型说过话，会话才「诞生」。`--session` 指向已有空文件且 size>0 但解析不出 header → throw，不覆盖用户文件。

## 树操作（人话）

- `appendMessage` 等：parent = 当前 leaf，然后 leaf = 新 id。
- `getBranch(id)`：从 id 走到根，再 reverse 成时间序。
- `buildContextEntries`：路径上若有 compaction，上下文 = `[compaction] + firstKept 到 compaction 前 + compaction 之后`。
- 导航/fork：改 `leafId`（具体方法在文件后半 `navigateTo` / `fork`）。历史行不删除。

`sessionEntryToContextMessages`：null content 的旧文件补 `[]`，避免 convertToLlm 炸。

## 会话目录

默认 `~/.pi/agent/sessions/--把 cwd 里的斜杠换成减号--/`。`findMostRecentSession` 给 `--continue`。列表可带 progress 回调，供选择器边扫边画。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 坏 JSON 行 | 跳过 |
| header 扫描超过 1MB | throw |
| 显式 session 文件非空但不是 pi 会话 | throw，不改文件 |
| `appendMessage` 直接塞 compactionSummary | 类型上禁止，必须 `appendCompaction` |
| `--no-session` persist=false | 内存树，不 mkdir |

`CURRENT_SESSION_VERSION = 3`。加载时 `migrateToCurrentVersion` 可能 `_rewriteFile`。

## 下一课

[28-settings-manager.ts.md](/series/pi-source/coding-agent/511-settings-manager-ts/)：全局/项目 settings.json 如何合并、何时因不信任而忽略项目文件。
