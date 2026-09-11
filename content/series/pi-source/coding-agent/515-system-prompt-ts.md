---
title: "30 · system-prompt.ts — 默认系统提示怎么拼"
summary: "分清 customPrompt（整段替换）和默认模板。Skill 只有在 active 工具里有 read 或 bash 时才注入——否则模型看见技能路径也打不开。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/system-prompt.ts`  
被谁调用：`AgentSession` 构造和每次工具集变化时 `buildSystemPrompt`。

## 本课目标

分清 `customPrompt`（整段替换）和默认模板。Skill 只有在 active 工具里有 `read` 或 `bash` 时才注入——否则模型看见技能路径也打不开。

## 在系统中的位置

```text
AgentSession
  resourceLoader.getSystemPrompt() / getAppendSystemPrompt() / getAgentsFiles() / getSkills()
  当前 active 工具名 + promptSnippet / promptGuidelines
  buildSystemPrompt(...)
  agent.state.systemPrompt = 结果
```

扩展 `before_agent_start` 可以再改写一轮，只对那一轮生效（11 课）。

## 默认模板段落

1. 角色：「expert coding assistant operating inside pi」
2. Available tools：只列出 **既在 selectedTools 又有 toolSnippets** 的名字。自定义工具没给 `promptSnippet` 就不会出现在这一节（描述仍在 tool schema 里）。
3. Guidelines：
   - 有 bash/powershell 且没有 grep/find/ls 时，加「用 shell 做 ls/rg/find」
   - 再加上各工具的 `promptGuidelines`
   - 永远有：简洁、路径写清楚
4. Pi 文档路径：`getReadmePath` / `getDocsPath` / `getExamplesPath`，并写明 docs/examples 相对包内路径，不要当成 cwd
5. `appendSystemPrompt`
6. `<project_context>` 里每个 AGENTS.md
7. `formatSkillsForPrompt`
8. `Current working directory:`（反斜杠换成 `/`）

## customPrompt 分支

SYSTEM.md 或 `--system-prompt` 走这里。不再输出默认角色/工具表/pi docs。仍会追加 append、project_context、skills、cwd。

`skillFileReadTool`：`["read","bash"].find(t => tools.includes(t))`。两个都没有则 skills 整段省略。有 read 优先。

## 失败与边界

`selectedTools` 默认四件套，但 AgentSession 传入的是**当前激活名**，`/tools` 关掉 bash 后下一轮系统提示会变。空 snippets → Available tools 显示 `(none)`。本函数不读盘，调用方必须把文件内容带进来。

## 下一课

[31-skills.ts.md](/series/pi-source/coding-agent/517-skills-ts/)：SKILL.md 发现、校验、以及 prompt 里那份 XML 清单。
