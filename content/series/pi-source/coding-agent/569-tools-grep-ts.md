---
title: "57 · tools/grep.ts — 内容搜索（ripgrep）"
summary: "description 写明尊重 .gitignore、50KB、行 500 字符。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/grep.ts`  
被谁调用：只读套件；默认会话**不**激活，除非 `defaultTools` 包含 `grep`。

## schema

- `pattern` string（正则或字面量）
- `path` 可选，默认 cwd
- `glob` 可选
- `ignoreCase` / `literal` 可选 bool
- `context` 可选，前后文行数
- `limit` 可选，默认 100 条匹配

description 写明尊重 .gitignore、50KB、行 500 字符。

## execute 副作用

**无写用户文件。** `ensureTool("rg")`：PATH 没有则下载到 `getBinDir()`（可联网；`PI_OFFLINE` 则失败）。`spawn(rg, ["--json", "--hidden", ...])`。

path 不存在 throw。rg 退出码 1 = 无匹配，当成功「No matches found」。其它非 0 且不是因为 limit kill → 错误。

命中 limit 后 `child.kill()`，`killedDueToLimit` 不把 kill 当失败。

无 context 时用 rg JSON 里的 line text；有 context 则 `ops.readFile` 再切块。

## 截断

三层，都在 execute 内：

1. 匹配条数 `limit`（默认 100）
2. 每行 `truncateLine` 500 字符 + `... [truncated]`
3. 拼好后 `truncateHead(..., maxLines: MAX_SAFE_INTEGER)` 只限 50KB

notice 拼在末尾，details 带 `matchLimitReached` / `truncation` / `linesTruncated`。

## 和 executeToolCalls 的关系

第一次 grep 可能下载 rg，耗时且写 bin 目录。并行多个 grep 可能同时 ensureTool——tools-manager 应能承受。abort 杀子进程。length 截断不 spawn rg。

扩展可换 `GrepOperations`（SSH 上的 isDirectory/readFile），但 rg 仍在本地 spawn，除非连 operations 一起自定义（默认 glob 仍走本地 rg）。完全远程需要自定义 execute，不是这文件的 default 路径。

## 下一课

[58-tools-find.ts.md](/series/pi-source/coding-agent/571-tools-find-ts/)。
