---
title: "29 · resource-loader.ts — 按 cwd 装上技能和扩展"
summary: "画出 reload 的顺序：设置 → 包管理 resolve → 扩展（可能先预加载再问信任）→ skills/prompts/themes → AGENTS.md → SYSTEM.md。信任回调插在「发现项目扩展需要执行」和「把它们"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/resource-loader.ts`（约 1100 行）  
被谁调用：`createAgentSessionServices` 的 `reload()`；`/reload` 再走一遍。

## 本课目标

画出 reload 的顺序：设置 → 包管理 resolve → 扩展（可能先预加载再问信任）→ skills/prompts/themes → AGENTS.md → SYSTEM.md。信任回调插在「发现项目扩展需要执行」和「把它们当正式扩展」之间。

## 在系统中的位置

```text
createAgentSessionServices
  new DefaultResourceLoader({ cwd, agentDir, settingsManager, --no-extensions, CLI 路径... })
  await resourceLoader.reload({ resolveProjectTrust })
    packageManager.resolve()
    loadExtensionsCached
    loadSkills / loadPromptTemplates / 主题
    loadProjectContextFiles
sdk / AgentSession
  getSkills / getExtensions / getAgentsFiles / getSystemPrompt
```

`ResourceLoader` 是接口；产品实现是 `DefaultResourceLoader`。SDK 可换。

## `loadProjectContextFiles`

候选名：`AGENTS.override.md`、`AGENTS.md`、`CLAUDE.md`（大小写变体）。顺序：

1. 全局 `agentDir` 下一份
2. 从 cwd 走到根的每一层各一份（近的在后，覆盖语义靠拼进 prompt 的顺序：祖先在前、cwd 在后）

git worktree：若当前是链接 worktree 且主仓库是祖先，主仓库那份与 worktree 同名的 context **视为被阴影**，不加载，避免同一逻辑仓库的说明出现两次。比较用 canonicalize/realpath（macOS `/tmp` → `/private/tmp`）。

## `reload` 逐步

1. `settingsManager.reload()`（信任状态不变）。
2. `packageManager.resolve()`：settings.packages + 本地路径 → 启用的扩展/skill/prompt/theme。
3. CLI `--extensions` 等经 `resolveExtensionSources(..., { temporary: true })`。
4. `--no-extensions` 时只保留 CLI 临时扩展。
5. 加载扩展。若调用方给了 `resolveProjectTrust`：先加载到能发 `project_trust` 的程度，问完再 `loadFinalExtensionSet`（预加载的不重复 jiti）。
6. skills / prompts / themes：默认目录 ∪ 包 ∪ CLI 路径；`--no-skills` 等旗标砍默认。
7. context files、`SYSTEM.md` / `APPEND_SYSTEM.md`（全局与项目发现）。
8. 各 `*Override` 钩子给 SDK 测试替换结果。

`extendResources` 让扩展的 `resources_discover` 再追加 skill/prompt/theme 路径，不整次 reload。

## SYSTEM.md

`getSystemPrompt()` 是**整份替换**默认系统提示的原文。`getAppendSystemPrompt()` 是追加段数组。二者都可来自文件路径或 CLI 传入的字面量（`resolvePromptInput`：路径存在则读文件，否则当文本）。

## 失败与边界

单份坏扩展进 `extensionsResult.errors`，不阻断其它。不存在的 CLI 路径记 error diagnostic。`noContextFiles` 时 AGENTS.md 不加载，但 SYSTEM.md 仍可来自 CLI `--system-prompt`。reload 不是热替换正在跑的 Agent：AgentSession 要重建 runner 和系统提示。

## 下一课

[30-system-prompt.ts.md](/series/pi-source/coding-agent/515-system-prompt-ts/)：把工具清单、AGENTS.md、Skill 焊成发给模型的那一长段。
