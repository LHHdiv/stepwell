---
title: "33 · slash-commands.ts — 内置斜杠命令名册"
summary: "本文件不执行任何命令。它只导出 BUILTINSLASHCOMMANDS 和类型，让 UI 知道 /model、/compact 是内核的。执行在 interactive mode 的命令表，或 AgentSession 的扩展命令分支"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/slash-commands.ts`  
被谁调用：交互 mode 自动完成、帮助；扩展命令冲突检测。

## 本课目标

本文件**不执行**任何命令。它只导出 `BUILTIN_SLASH_COMMANDS` 和类型，让 UI 知道 `/model`、`/compact` 是内核的。执行在 interactive mode 的命令表，或 AgentSession 的扩展命令分支。

## 内容

`SlashCommandSource = "extension" | "prompt" | "skill"`：自动完成用来标来源。内置另有 `BuiltinSlashCommand`（name/description/argumentHint）。

名册包括：settings、model、tree、thinking、scoped-models、export、import、share、copy、name、session、changelog、hotkeys、fork、clone、trust、login、logout、new、compact、resume、reload、quit。

`argumentHint` 仅少数：model、thinking、login。

## 失败与边界

增删内置命令要同时改交互 mode 的 handler。print 模式用户打 `/compact` 会当普通 prompt（除非扩展注册了同名）。模板和 skill 的 `/name` 不在这张表，完成器要合并三份来源。

## 下一课

[34-messages.ts.md](/series/pi-source/coding-agent/523-messages-ts/)：coding-agent 特有的 AgentMessage 如何变成厂家 Message。
