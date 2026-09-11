---
title: "80 · trust-manager.ts — `trust.json` 与「有没有需要门禁的资源」"
summary: "cwd/.pi/ 下存在：settings.json、extensions、skills、prompts、themes、SYSTEM.md、APPENDSYSTEM.md 任一。 或 cwd 到根的某层有 .agents/skills，"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/trust-manager.ts`

## 需要信任的项目资源

`cwd/.pi/` 下存在：settings.json、extensions、skills、prompts、themes、SYSTEM.md、APPEND_SYSTEM.md 任一。  
或 cwd 到根的某层有 `.agents/skills`，但排除 `$HOME/.agents/skills`（那是用户级）。

## `ProjectTrustStore`

路径 `agentDir/trust.json`。键是 canonicalize 的绝对路径，值 true/false/null。`get` 从 cwd 向根找最近的 true/false（null 当没有）。`setMany` 带目录锁。

`getProjectTrustOptions`：Trust 本目录、Trust 父目录（同时 delete 本目录键以继承）、可选 session-only、Do not trust、可选 do-not-trust session-only。

坏 JSON throw。写盘排序 key，带尾换行。

## 下一课

[81-http-dispatcher.ts.md](/series/pi-source/coding-agent/617-http-dispatcher-ts/)。
