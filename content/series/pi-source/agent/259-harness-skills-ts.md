---
title: "18 · skills.ts — 扫目录、吃 frontmatter、尊重 ignore"
summary: "能指出：哪些文件算 Skill、ignore 怎么叠、诊断为什么是 warning 而不是 throw、显式调用和模型可见列表的差别。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/skills.ts`  
被谁调用：harness 宿主在构造 Resources 之前；coding-agent 有自己的 skill loader，但这份是 ExecutionEnv 上的可移植实现。

## 本课目标

能指出：哪些文件算 Skill、ignore 怎么叠、诊断为什么是 warning 而不是 throw、显式调用和模型可见列表的差别。

## `formatSkillInvocation`

```text
<skill name="..." location="...">
References are relative to {dirname(filePath)}.

{content}
</skill>
```

可选追加用户 `additionalInstructions`。`lane.skill` accept 时把这整段当成一条 user 消息。

## `loadSkills(env, dirs, context)`

每个 dir：`fileInfo` 失败且不是 not_found → warning `file_info_failed`；not_found 静默跳过。必须是目录。

递归 `loadSkillsFromDirInternal`：

1. 读该目录的 `.gitignore` / `.ignore` / `.fdignore`，规则相对 **rootDir** 加入 `ignore()` matcher。
2. 先处理名为 `SKILL.md` 的文件。
3. 根目录（`includeRootFiles`）还会加载「直接子级、带 skill frontmatter 的其它 `.md`」。
4. 子目录继续递归，`includeRootFiles=false`（只有 SKILL.md 结构，不再把任意 README 当 skill）。

symlink：`resolveKind` 跟一层，目录当目录、文件当文件；循环/未知记诊断。

## frontmatter

YAML。`name` 最长 64，`description` 最长 1024。`disable-model-invocation` → `disableModelInvocation`。缺 name 用文件名。parse 失败 / 元数据非法 → `parse_failed` / `invalid_metadata`，这份文件不当 skill。

## `loadSourcedSkills`

每个输入带 `source`（例如 `"user"` / `"project"`）。包不解释 source，只原样挂到 skill 和 diagnostic 上。`mapSkill` 可换成宿主子类型。

## 失败与边界

加载从不 throw 业务错误：坏文件变成 diagnostics，好文件照收。缺目录不是错误。这和 `validateToolNames` 相反——工具名冲突要硬失败，技能损坏只警告。

## 下一课

[19 · prompt-templates.ts](/series/pi-source/agent/260-harness-prompt-templates-ts/)：模板不递归、占位符替换规则更像 slash 命令。
