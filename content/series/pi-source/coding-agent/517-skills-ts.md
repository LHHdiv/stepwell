---
title: "31 · skills.ts — Agent Skills 发现与注入"
summary: "对照 agentskills.io 的发现规则：目录里有 SKILL.md 就是一个 skill 根，不再往下扫；名字/描述有硬限制。prompt 里只给 name/description/location，正文靠模型自己 read。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/skills.ts`  
被谁调用：`DefaultResourceLoader.updateSkillsFromPaths`；`buildSystemPrompt` 用 `formatSkillsForPrompt`；`AgentSession._expandSkillCommand` 用 skill 名。

## 本课目标

对照 [agentskills.io](https://agentskills.io/integrate-skills) 的发现规则：目录里有 `SKILL.md` 就是一个 skill 根，不再往下扫；名字/描述有硬限制。prompt 里只给 name/description/location，正文靠模型自己 `read`。

## 发现规则 `loadSkillsFromDir`

对每个目录：

1. 先找 `SKILL.md`（含 symlink 指向文件）。命中则加载并 **return，不再看兄弟**。
2. 否则：跳过 `.` 开头和 `node_modules`；子目录递归；根层（`includeRootFiles`）的直接 `.md` 子文件也当 skill。
3. `.gitignore` / `.ignore` / `.fdignore` 用 `ignore` 包，规则相对扫描根加前缀。

`loadSkills` 合并来源：

1. `agentDir/skills`（user）
2. `cwd/.pi/skills`（project）
3. 显式路径（settings.packages、CLI `--skills`）

同名：先到先得，后来记 collision diagnostic。realpath 相同（symlink 重复）静默跳过。

## 校验

frontmatter：`name` 小写 `[a-z0-9-]+`，≤64，不能首尾 `-`、不能 `--`。`description` 必填字符串 ≤1024。`disable-model-invocation: true` 的 skill **不进系统提示**，只能 `/skill:name` 显式调。

名字缺省用目录名或文件名。

## `formatSkillsForPrompt`

可见 skill 包进 `<available_skills>` XML，字段 escape。第一句指示用 read（或 bash）加载 `location`；相对路径相对 skill 目录解析。

## `/skill:name`

展开不在本文件。AgentSession 把命令换成「按该 SKILL.md 做，参数是 …」。说明书仍在磁盘，模型随后 read。

## 失败与边界

坏 YAML/超长名字 → diagnostic，不进列表。不存在的显式路径 warning。项目 skill 是否加载仍受信任门（ResourceLoader 根本不扫项目包）。扫描是同步 `readdirSync`，巨大 node_modules 靠跳过名字，但超深 skill 树仍可能慢。

## 下一课

[32-prompt-templates.ts.md](/series/pi-source/coding-agent/519-prompt-templates-ts/)：`/foo args` 如何展开成模板正文。
