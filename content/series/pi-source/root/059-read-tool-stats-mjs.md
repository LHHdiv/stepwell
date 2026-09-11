---
title: "55 · read-tool-stats.mjs — read 工具读了多大、是否总在重读"
summary: "报告回答的产品问题：模型是不是用 read 把整个大文件灌进上下文、offset/limit 用得勤不勤、同一 path 在一次会话里被读几次。输出默认 HTML，--json / --text 可选，--bucket day|week"
tags: [pi, root]
---
源码：`scripts/read-tool-stats.mjs`  
被谁调用：优化 `packages/coding-agent/src/core/tools/read.ts` 的人。默认 auto-since 用**仓库里**当前 `read.ts` 的 birthtime（`packages/coding-agent/src/core/tools/read.ts`），和 edit 脚本默认盯 `~/.pi/agent/extensions/edit.ts` 不同：read 以源码文件诞生时间为界，edit 以用户扩展为界。

## 本课目标

报告回答的产品问题：模型是不是用 read 把整个大文件灌进上下文、offset/limit 用得勤不勤、同一 path 在一次会话里被读几次。输出默认 HTML，`--json` / `--text` 可选，`--bucket day|week` 做趋势（柏林时区，与 context-stats 相同）。

CLI 形状几乎是 edit-stats 的兄弟：`--sessions-dir`、`--model`、`--top`、`--since`、`--all-sessions`、`--auto-since-path`、`--include-records`。多出来的是 `--bucket` 和 HTML/text。

## 文件做什么

同样 walk JSONL + readline，解析 assistant toolCall `name==="read"` 的 arguments（path/offset/limit）以及对应 toolResult 的字节/估 token。`--auto-since-path` 可改到你刚部署的实验实现。

`REPORT_TIME_ZONE = "Europe/Berlin"`。`formatDay` 用 `en-CA` 的 formatToParts 拼 YYYY-MM-DD，避免 `toISOString` 的 UTC 偏移。

大文件用流，避免 cost.ts 那种整文件读。

## 关键逻辑

失败会怎样：

- birthtime 在某些文件系统（复制过来的 git checkout）等于 mtime 或 epoch：自动 since 可能几乎等于「全部」或「全部丢掉」。`--since` 显式更可靠
- 工具改名 / 参数从 `file_path` 变成 `path`：统计归零。要跟 `read.ts` schema 同步
- HTML 默认写到哪（stdout 或 tmp）以脚本后半为准；管道到文件时用 `--json` 更稳
- 与 51 课 tool-stats 重叠：tool-stats 给所有工具直方图；本课只深挖 read 的 offset/limit 行为。改 read 截断策略时两份都看

## 和启动链的关系

无。read 是默认四件套之一，在 `createAgentSession` 里按名字装配（见 coding-agent 09 课）。本脚本是装配之后、真实用户用过几周，再回来看的镜子。

根目录 + `scripts/` 工程文件到此结束。产品执行链从 [16-pi-test.sh](/series/pi-source/root/020-pi-test-sh/) 交给 [coding-agent 01 · experimental/cli.ts](/series/pi-source/coding-agent/467-experimental-cli-ts/)。
