---
title: "51 · tool-stats.ts — 工具调用次数和结果有多大"
summary: "看 JSONL 里两种消息如何配对："
tags: [pi, root]
---
源码：`scripts/tool-stats.ts`  
被谁调用：维护者分析「read/bash/edit 各占多少上下文」。默认扫整个 `~/.pi/agent/sessions`（递归所有 cwd），写出 HTML 到 `tmpdir()/pi-tool-stats.html`，并 `openBrowser`（coding-agent 自己的工具函数）。

## 本课目标

看 JSONL 里两种消息如何配对：

- assistant 的 `content[]` 里 `type: "toolCall"` → 记 `calls++`，用 id 放入 `callsById`
- `role: "toolResult"` → 用文本长度/4 估 token，记入该 toolName，error 则 `errors++`；若能用 `toolCallId` 找回 bash 原命令，再按 `commandKey` 分桶

`commandKey`：取第一段（到换行/`&&`/`||`/`;`/`|`），剥掉 `VAR=x` 和可选 `sudo`，留下 `bin` + 第一个非 option 参数。于是 `git commit` 和 `git push` 分开，`ls -la` 都算 `ls`。

桶边界：0,50,100,…,32000,+∞。用来看「工具结果是不是经常把 32k 垃圾灌进上下文」。

## 文件做什么

`jsonlFiles` 递归。坏行 `parseErrors++` 继续。不按项目过滤——要看全局 agent 行为。`--sessions-dir` / `--output` 可改。

后半（未在课里逐行展开）用这些 Map 拼 HTML 表和简易直方图，然后打开浏览器。依赖 `open-browser.ts`：在无显示的 SSH 里会失败或 no-op，文件仍写出。

token 估计是 `length/4`，对 CJK 和 base64 图片块会严重不准。趋势可用，不能当计费。

## 关键逻辑

失败会怎样：

- 会话目录不存在 throw
- toolResult 没有 toolName / id 对不上：结果仍进 toolName 桶，但 bash 细分丢失
- 打开浏览器失败：统计已算完，人可以自己打开 html
- 把 HTML 发到公开处：里面可能有命令摘要（commandKey 不是全文），但仍是使用痕迹

## 和启动链的关系

无。读的是工具执行完写进 JSONL 的内容。优化 `read.ts`/`bash.ts` 是否截断输出时，用本报告看分布。

## 下一课

把会话变成可喂给子 agent 的 transcript：[52-session-transcripts.ts.md](/series/pi-source/root/056-session-transcripts-ts/)。
