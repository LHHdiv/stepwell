---
title: "59 · tools/ls.ts — 列目录"
summary: "只 exists / stat / readdir。目录不存在或不是目录 throw。条目排序 case-insensitive。目录名加 /。stat 失败的条目跳过。空目录返回 (empty directory)。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/ls.ts`  
被谁调用：只读套件，默认不激活。模型常用 bash `ls`；本工具不 spawn、不尊重 gitignore、包含点文件。

## schema

- `path` 可选，默认 cwd
- `limit` 可选，默认 500 条

## execute 副作用

只 `exists` / `stat` / `readdir`。目录不存在或不是目录 throw。条目排序 case-insensitive。目录名加 `/`。stat 失败的条目跳过。空目录返回 `(empty directory)`。

## 截断

条数 limit + `truncateHead` 50KB（maxLines 放开）。notice 提示加大 limit。

## 和 executeToolCalls 的关系

轻量，可并行。不进 mutation queue。abort 在 Promise 入口检查，readdir 中途的 abort 靠 listener reject（可能和 resolve 竞争，用 signal 的 once）。

## 下一课

[60-tools-truncate.ts.md](/series/pi-source/coding-agent/575-tools-truncate-ts/)：所有工具共享的体积闸门。
