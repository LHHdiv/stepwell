---
title: "32 · prompt-templates.ts — slash 模板展开"
summary: "模板是「用户输入 /name args → 替换成 markdown 正文」。不是 LLM 工具。占位符是 bash 风格，且不递归：参数里的 $1 不会再替。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/prompt-templates.ts`  
被谁调用：ResourceLoader 加载；`AgentSession.prompt` 在 Skill 展开之后 `expandPromptTemplate`。

## 本课目标

模板是「用户输入 `/name args` → 替换成 markdown 正文」。不是 LLM 工具。占位符是 bash 风格，且**不递归**：参数里的 `$1` 不会再替。

## 加载

非递归扫目录里的 `*.md`：

- `agentDir/prompts/`
- `cwd/.pi/prompts/`
- 显式路径（文件或目录）

名字 = 去掉 `.md` 的 basename。description：frontmatter `description`，否则正文第一行截到 60 字符。`argument-hint` 给自动完成。

## `parseCommandArgs`

引号内空格保留。单双引号。没有反斜杠转义。未闭合引号：引号后的字符仍收进当前参数直到结束。

## `substituteArgs`

| 写法 | 含义 |
|---|---|
| `$1` `$2` … | 位置参数，缺省空串 |
| `$@` `$ARGUMENTS` | 全部参数空格拼接 |
| `${N:-default}` | 缺/空用 default |
| `${@:-default}` | 全部为空用 default |
| `${@:N}` `${@:N:L}` | 从 N 起切片（1-indexed，0 当 1） |

替换只扫模板字符串。default 里的 `$1` 原样输出。

## `expandPromptTemplate`

不以 `/` 开头：原样返回。正则 `/([^\s]+)(?:\s+([\s\S]*))?` 取名和其余。找不到同名模板：原样返回（可能是扩展命令或普通句子）。找到则 substitute。

AgentSession 里扩展命令**先**于模板：`/login` 被扩展/内置吃掉就不会当模板。内核 slash（`/model`）在交互 mode 命令表，print 模式几乎碰不到。

## 失败与边界

读文件失败返回 null，跳过。同名后加载的不会覆盖——`expandPromptTemplate` 用 `find` 第一个。项目/全局冲突要靠 ResourceLoader 的 collision 诊断，本函数不管。

## 下一课

[33-slash-commands.ts.md](/series/pi-source/coding-agent/521-slash-commands-ts/)：内置 slash 清单（给自动完成，不是执行器）。
