---
title: "58 · tools/find.ts — glob 找文件（fd）"
summary: "无写用户工程。ensureTool(\"fd\") 可能下载。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/find.ts`  
被谁调用：只读套件，默认不激活。

## schema

- `pattern` string：glob，如 `*.ts`、`src/**/*.spec.ts`
- `path` 可选搜索根
- `limit` 可选，默认 1000

## execute 副作用

无写用户工程。`ensureTool("fd")` 可能下载。

默认 spawn `fd --glob --hidden --max-results`。在 git 仓库内**不加** `--no-require-git`，让父级 gitignore 在 nested repo 边界停下；仓库外加 `--no-require-git`。pattern 含 `/` 时 `--full-path` 并可能加 `**/` 前缀；Windows 把 `/` 换成 `[/\\]`。

自定义 `operations.glob` 则不跑 fd（SSH）。`relativizeFindResultPath` 把结果变成相对搜索根的 posix 路径。

## 截断

`limit` 条 + `truncateHead` 50KB。notice 建议加大 limit 或收窄 pattern。

## 和 executeToolCalls 的关系

同 grep：可能下载二进制；abort 杀 fd。未激活不在 tools 数组。并行 find 会起多个 fd。

## 下一课

[59-tools-ls.ts.md](/series/pi-source/coding-agent/573-tools-ls-ts/)。
