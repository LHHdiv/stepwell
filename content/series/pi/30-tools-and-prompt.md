---
title: 第30讲·工具落地与系统提示词
summary: 精读 coding-agent 的工具工厂与 system-prompt.ts——28 行的提示词构建函数里藏着什么。
objectives:
  - 了解内置工具清单与工具工厂的组织方式
  - 精读 buildSystemPrompt（28 行）的段落结构
  - 理解 Skills 如何被注入提示词
tags: [pi, coding-agent, system-prompt]
keyPoints:
  - 工具工厂在 core/tools/index.ts，ToolName 联合类型列出 83 个工具名
  - buildSystemPrompt 只有 28 行——段落拼接，扩展可注入
  - Skills 通过 formatSkillsForPrompt 变成提示词里的"技能清单"
---

卷四：产品层 `packages/coding-agent`。这一讲看两个"装配"环节：工具从哪来、系统提示词怎么拼。

## 工具工厂

`core/tools/index.ts` 用一个 `ToolName` 联合类型列出全部内置工具名（read/edit/bash/grep/glob…），工厂函数按名字创建工具实例。每个工具一个文件（如 `tools/read.ts`），实现 pi-agent-core 的 `AgentTool` 接口（第 21 讲）——**接口在上游包，实现在产品包**，依赖方向干净。

挑 `read.ts` 这个最常用的看一眼：参数 schema（路径/行号范围）、execute 里的安全检查（路径白名单）、大小截断、带行号输出——对照 dsh 第 31 讲的"好工具四标准"，你会发现两边连"截断要告知"的细节都一致。**工具设计的最佳实践是行业共识**。

## buildSystemPrompt：28 行的功力

`core/system-prompt.ts` 的构建函数只有 28 行，骨架：

```
基础身份段（你是 pi，运行环境信息）
+ 工具使用守则
+ Skills 清单（formatSkillsForPrompt 注入）
+ 扩展注入的段落
```

对照 dsh 的段落注册制（第 23 讲）：pi 更轻——没有优先级系统，就是顺序拼接；但扩展 API 一样留了注入口（`ExtensionAPI` 能改提示词）。**段落制的两个流派**：注册表式（dsh，可排序可管理）与拼接式（pi，简单直接）。

## Skills：提示词里的技能清单

`core/skills.ts`（488 行）实现了 Agent Skills 标准：每个 Skill 是一个目录，含 `SKILL.md`（frontmatter 声明名称/描述 + 正文是操作指南）。`formatSkillsForPrompt` 把所有 Skill 的名称和描述拼进系统提示词，模型看到清单，需要时用 `/skill:name` 或自然语言触发。

妙处在**分层发现**：`~/.pi/agent/skills/`（全局）→ `.pi/skills/`（项目）→ `.agents/skills/`（仓库共享）。个人习惯、项目规范、团队约定各归其位。

而"自我扩展"的最后一环：智能体可以**自己写 SKILL.md** 存进 skills 目录——它学会的东西，重启后依然记得。这就是第 00 讲说的"智能体在成长"的实现机制。

## 试一试

在 `~/.pi/agent/skills/` 手动建一个目录 `my-first-skill/`，写一个最简 SKILL.md（frontmatter 两行：name、description + 正文几行指令），重启 pi 后问它"你有哪些技能"——看你的第一个 Skill 出现在清单里。

## 下一讲预告
pi 的招牌体验：TUI。下一讲看 interactive-mode.ts（6403 行）的初始化结构——只看骨架，不啃全文。
