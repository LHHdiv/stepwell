---
title: "19 · prompt-templates.ts — 非递归 .md 模板与 $1 / $@ 替换"
summary: "和 Skill 对比：模板 不进系统提示，只在显式调用时展开成用户消息。加载规则更窄：目录只看直接子级 .md。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/prompt-templates.ts`  
被谁调用：`lane.promptFromTemplate`；宿主加载 `Resources.promptTemplates`。

## 本课目标

和 Skill 对比：模板 **不进系统提示**，只在显式调用时展开成用户消息。加载规则更窄：目录只看直接子级 `.md`。

## 加载

`loadPromptTemplates(env, paths)`：path 可以是文件或目录。not_found 跳过。目录 `listDir` 后按文件名排序，只收 `.md` 文件，**不递归**。文件必须 `endsWith(".md")`。

frontmatter 可选 `description`、`argument-hint`。parse 失败 → diagnostic，该文件丢弃。模板 `name` 来自去掉 `.md` 的文件名。

`loadSourcedPromptTemplates` 与 skills 同源模式。

## `parseCommandArgs`

简单 shell 风格：单双引号，空白切分。没有反斜杠转义。给宿主把 `"/foo bar 'a b'"` 切成 args 用。

## `substituteArgs`

| 占位符 | 含义 |
|---|---|
| `$1` `$2` … | 第 n 个参数，缺省变 `""` |
| `$@` / `$ARGUMENTS` | 全部参数以空格拼接 |
| `${@:N}` | 从第 N 个到末尾 |
| `${@:N:L}` | 从 N 起共 L 个 |

先替换 `$数字`，再 `${@:}`，再 `$ARGUMENTS`，最后 `$@`。顺序重要：若先换 `$@`，会破坏 `$1`。

`formatPromptTemplateInvocation` 就是 `substituteArgs(template.content, args)`。空展开（content 全是缺省占位符且 args 空）时 `accept` 仍允许 0 条 user 消息——等于只靠 inbox 里已有的 nextRun。

## 失败与边界

未知模板名是 `UnknownTemplate` Result，发生在 accept，不发生在加载。加载期坏文件只 warning。

## 下一课

[20 · telemetry.ts](/series/pi-source/agent/261-harness-telemetry-ts/)：schema 声明远多于生产实际开的 span。
