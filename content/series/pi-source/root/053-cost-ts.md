---
title: "49 · cost.ts — 按项目目录把会话花费加起来"
summary: "学会会话目录的编码规则，后面 50–55 课都用它："
tags: [pi, root]
---
源码：`scripts/cost.ts`  
被谁调用：维护者本地 `npx tsx scripts/cost.ts -d /path/to/project -n 7`。不进 CI。读的是 **`~/.pi/agent/sessions` 下按 cwd 编码的 JSONL**，不是仓库里的测试 fixture。

## 本课目标

学会会话目录的编码规则，后面 50–55 课都用它：

```ts
// /Users/you/proj  →  --Users-you-proj--
encodeSessionDir(dir) = "--" + dir去掉前导斜杠后把 / 换成 - + "--"
```

文件名 `<timestamp>_<uuid>.jsonl`，timestamp 里用 `-` 代替 ISO 的 `:` 和毫秒点。本脚本用正则改回 `T08:25:07.381Z` 再和 `--days` 截止日期比。

只统计 `type==="message"` 且 `message.role==="assistant"` 且存在 `usage.cost` 的行。按日历日 × provider 累加 total/input/output/cacheRead/cacheWrite/requests。坏 JSON 行静默 skip。

## 在仓库中的位置

依赖 `process.env.HOME`。`./test.sh` 隔离 HOME 后本脚本会找不到你的真会话——它本来就不是测试。在开发机直接跑。

必填 `--dir` 和 `--days`，否则 usage + exit 1。会话目录不存在也 exit 1。时间窗内无数据 exit 0 并打印 No sessions。

## 文件做什么

逐文件读入内存 `readFileSync`。会话很多时会慢、会占 RAM。后续 `session-context-stats.mjs` 改成 readline 流，是同一家族的进化。本文件更早、更小，只关心钱。

输出：每天每个 provider 一行美元，再按 provider 汇总，最后 GRAND TOTAL。没有 JSON 模式。

日期用 `entry.timestamp` 的 UTC `toISOString().split("T")[0]`，和 `stats.ts` 的「本地日历日」不同。同一条会话在东京和柏林可能掉进不同的「天」。读数字时要知道这一点。

## 关键逻辑

失败会怎样：

- cwd 编码和产品不一致（产品若改了 encode 算法）→ 找不到目录或加错项目。本脚本复制了一份 encode，没有 import session-manager。漂移是真实风险
- 无 cost 字段的厂家：那些 assistant 消息被跳过，总额偏低，不是脚本崩溃
- 把含秘密的 JSONL 贴到 issue：会话里可能有代码和 prompt。本工具只打印钱，但仍读了全文到内存

## 和启动链的关系

无。读的是 AgentSession 写盘的副作用。课表在 session-manager 课会看到 JSONL 的写；本课是读的最简客户端。

## 下一课

同一数据，加上 token 和本地日历：[50-stats.ts.md](/series/pi-source/root/054-stats-ts/)。
