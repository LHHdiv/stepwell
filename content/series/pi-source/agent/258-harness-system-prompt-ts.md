---
title: "17 · system-prompt.ts — 把 Skill 收成 agentskills.io 的 XML 块"
summary: "这不是 coding-agent 那份中英系统提示。它只做一件事：可见技能 → <availableskills> 列表。完整说明书在 SKILL.md，模型要用 read 去打开 location。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/system-prompt.ts`  
被谁调用：宿主拼 `systemPrompt` 时；`formatSkillsForSystemPrompt`。

## 本课目标

这不是 coding-agent 那份中英系统提示。它只做一件事：可见技能 → `<available_skills>` 列表。完整说明书在 SKILL.md，模型要用 read 去打开 `location`。

## `formatSkillsForSystemPrompt`

过滤 `disableModelInvocation`。空则返回 `""`（不要残留空 XML）。否则：

```text
The following skills provide specialized instructions...
Read the full skill file when the task matches its description.
When a skill file references a relative path, resolve it against the skill directory...

<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

`escapeXml` 处理 `& < > " '`。

`lane.skill(name)` 走另一条路：`formatSkillInvocation`（课 18）把 **全文** 塞进用户消息，不依赖模型先 read。

## 失败与边界

不校验 name 是否重复——那是 `loadSkills` / 宿主的事。description 过长会直接进提示，占 token。

## 下一课

[18 · skills.ts](/series/pi-source/agent/259-harness-skills-ts/)：从目录加载 SKILL.md。
