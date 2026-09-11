---
title: "56 · tools/powershell.ts — Windows 上的另一件 shell 工具"
summary: "与 bash 相同：command + 可选 timeout 秒。名字是 powershell，模型必须调这个 name。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/powershell.ts`  
被谁调用：`createAllToolDefinitions` 里有，**不在**默认四件套。Windows 用户要把 `powershell` 放进 `defaultTools` 或 `--tools`。

## schema

与 bash 相同：`command` + 可选 `timeout` 秒。名字是 `powershell`，模型必须调这个 name。

## execute 副作用

`createShellToolDefinition` 同一套。差别：

- `createLocalPowerShellOperations`：每条命令前加 `try { [Console]::OutputEncoding=[System.Text.Encoding]::UTF8 } catch {}`
- shell 来自 `getPowerShellConfig()`
- TUI prompt 是 `PS>`，临时文件前缀 `pi-powershell`

`commandPrefix` 不从 settings 自动套过来（`PowerShellToolOptions` 只 pick operations / exposeSessionEnvironment / spawnHook）。AgentSession `_buildRuntime` 只给 bash 传 `commandPrefix`/`shellPath`。

## 截断

同 bash：`truncateTail` 50KB/2000 行 + tmp 文件。

## 和 executeToolCalls 的关系

独立工具名。与 bash 并行可同时开 bash 和 pwsh。未激活时 schema 不会发给模型。length 截断同样整批不执行。

## 下一课

[57-tools-grep.ts.md](/series/pi-source/coding-agent/569-tools-grep-ts/)。
