---
title: "53 · session-context-stats.mjs — 会话把上下文窗口用到了几成"
summary: "看它如何给每条 assistant 消息找 contextWindow："
tags: [pi, root]
---
源码：`scripts/session-context-stats.mjs`  
被谁调用：维护者判断要不要更激进地做 compaction。默认 HTML 报告，时区写死 `Europe/Berlin`（维护者所在地），不是 UTC、也不是本机 TZ。读数字时先看这个常量。

## 本课目标

看它如何给每条 assistant 消息找 `contextWindow`：

1. 正则扫仓库里的 `packages/ai/src/models.generated.ts`（可选，不在仓库外也能跑）
2. 再读 `~/.pi/agent/models.json` 的 overrides / 自定义 models

键是 `provider/modelId`。usage 里的 token 总数 / window = 占用率。再按天（柏林日历）画 bar。可按 `--model` 子串、`--model-prefix`、`--bash-contains`（或快捷 `--git-commit-or-push`）、`--cwd` / `--all-cwds` 过滤会话。

默认 `--cwd` 是当前目录：只看这个项目。和 tool-stats 默认扫全部相反。

## 文件做什么

`walkJsonlFiles` + readline 流，适合大文件。`parseSessionFileTimestamp` 与家族其它脚本同一套文件名解码。`--since` / `--all-sessions` 控制时间；help 文案说 default already scans all，和 `--cwd` 默认收窄并存——「all」指时间不是指全部 cwd。

过滤 bash：会话里若没有任何 toolCall 命令包含给定子串则整份文件丢掉。用来回答「真正在 commit/push 的会话是不是更容易顶满窗口」。

输出：`--json` / `--text` / 默认 HTML。median、percent、40 列 `█░` bar。缺 window 的模型显示 n/a，不除零。

## 关键逻辑

失败会怎样：

- generated.ts 结构改了，正则扫不出 contextWindow：window 全靠用户 models.json，占用率变 n/a，报告看起来像「没有压力」
- 柏林时区让 UTC 晚上的会话算进「第二天」——和 stats.ts 本地日又不同。三份工具三种日历
- `--cwd` 编码必须匹配 session 目录名。实现里会按 path 比较 JSONL 内记录的 cwd 或目录名（后半）。若只按目录 encode，和 49 课同一漂移风险

## 和启动链的关系

无。读的是循环里每轮 `usage` 写盘的结果。AgentSession 的 compaction 决策在运行时；本报告是事后证明「我们是否经常撞窗」。

## 下一课

edit 工具的失败原因和替换膨胀：[54-edit-tool-stats.mjs.md](/series/pi-source/root/058-edit-tool-stats-mjs/)。
