---
title: "50 · stats.ts — 按本地日历看 token 和花费"
summary: "对照 49 课 cost.ts："
tags: [pi, root]
---
源码：`scripts/stats.ts`  
被谁调用：维护者 `tsx scripts/stats.ts -n 7 -d <cwd>`。默认 cwd 是 `process.cwd()`，默认 7 天，默认 sessions 根 `~/.pi/agent/sessions`。可用 `--sessions-base` 指到拷贝的数据。

## 本课目标

对照 49 课 `cost.ts`：

| | cost.ts | stats.ts |
|---|---|---|
| 日期 | UTC 日 | **本地**年月日 `localDayKey` |
| 指标 | 只有 cost | token 各档 + cost + assistant 条数 + 会话数 |
| 缺参 | dir 和 days 都必填 | days 默认 7，dir 默认 cwd |
| 实现 | 无类型接口 | 有 Usage/Totals，结构更接近产品类型 |

`addUsage` 把一条 assistant `usage` 累进 Totals，并用 `Set<string>` 记会话文件名去重。按天还有 `providers: Map`。

时间窗：`start` 是今天 00:00 往回 `days-1` 天，`end` 是明天 00:00。文件仍先用文件名时间戳过滤（与 cost 相同的 dash→ISO 技巧，见后半循环）。

## 文件做什么

打印一行对齐的表：messages、sessions、input/output/cache、total tokens、cost。先每天，再 grand total。格式化用 `toLocaleString("en-US")` 和 `$x.xxxx`。

没有 `--json`。比 cost 更适合终端里每天看「我这个项目烧了多少」。

`--days` 必须是正整数，否则 throw（未被 catch 则非零退出）。

会话目录不存在 throw，不像有的脚本 print 后 exit 1。

## 关键逻辑

失败会怎样：

- 时区：你在 UTC+8 周五凌晨看「今天」，和 CI 的 UTC 不同。这是故意用本地日——账单体感跟你的工作日走
- encode 函数与 cost.ts 复制粘贴，和产品漂移风险相同
- 大 JSONL 一次性 readFileSync：与 cost 相同的内存问题

## 和启动链的关系

无。只读盘。

## 下一课

工具调用体积分布，会打开浏览器：[51-tool-stats.ts.md](/series/pi-source/root/055-tool-stats-ts/)。
