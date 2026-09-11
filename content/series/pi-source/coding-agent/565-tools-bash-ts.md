---
title: "55 · tools/bash.ts — 跑 shell"
summary: "snippet：Execute bash commands；guideline：可看 PI 环境变量。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/bash.ts`（约 400 行）  
被谁调用：默认四件套；powershell 复用 `createShellToolDefinition`。用户 `!cmd` 走 `bash-executor.ts`，不是这件工具。

## schema

- `command` string
- `timeout` 可选 number：**秒**。无默认超时。上限约 2.147e9 秒（32 位 ms 最大值）

snippet：`Execute bash commands`；guideline：可看 `PI_*` 环境变量。

## execute 副作用

这是最重的副作用：任意进程、任意写盘，权限等于用户。

1. 可选 `commandPrefix`（settings `shellCommandPrefix`，例如 `shopt -s expand_aliases`）前置
2. `resolveSpawnContext`：cwd、env。默认删掉 PI_* 再按 `exposeSessionEnvironment`（默认 true）加回 `PI_SESSION_ID/FILE/PROVIDER/MODEL/REASONING_LEVEL`。`spawnHook` 可再改
3. `ops.exec`：默认 `createLocalBashOperations` → `spawn(shell, args, { cwd, detached: 非 win32, env })`。stdin 传输或 argv 传输看 `getShellConfig`
4. stdout/stderr 合流进 `OutputAccumulator`，`onUpdate` 节流 100ms 给 TUI
5. abort / timeout：`killProcessTree`
6. 非 0 退出：**throw**（输出附在 Error.message 里），loop 当成 isError toolResult
7. 成功：content 为截断后的输出

cwd 不存在：exec 开头 access 失败，不 spawn。

## 截断

`OutputAccumulator` + `truncateTail`：保留**末尾** 2000 行 / 50KB（shell 错误通常在最后）。超限把完整输出写到 tmp `pi-bash-*.log`，文本末尾告诉模型 `Full output: /tmp/...`。单行超过 50KB 可 `lastLinePartial`。

这与 agent-loop 的 length 截断无关：那是模型输出 JSON 被窗口切掉。bash 截断是 **execute 之后** 控制回传体积，命令已经跑完（除非 timeout/abort）。

## 和 executeToolCalls 的关系

未标 sequential。并行两个 bash 会真的同时跑——`cd` 互不影响（各有 cwd 参数，但都是同一 session cwd），写同一文件会打架。扩展 `tool_call` 可改写/拦截 command。`onUpdate` 对应 loop 的 `tool_execution_update`。

signal 来自 Agent abort（用户 Esc）。timeout 是工具参数，不是 HTTP idle。

## 下一课

[56-tools-powershell.ts.md](/series/pi-source/coding-agent/567-tools-powershell-ts/)。
