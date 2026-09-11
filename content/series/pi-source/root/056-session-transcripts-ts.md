---
title: "52 · session-transcripts.ts — 导出 transcript，可选再派 pi 去挖模式"
summary: "看两段：纯导出如何切块；分析如何避免把 100k 字符一次性塞进 prompt。"
tags: [pi, root]
---
源码：`scripts/session-transcripts.ts`  
被谁调用：维护者想从自己的 JSONL 里提炼 AGENTS.md / skill 草稿时。`--analyze` 会 **spawn 真正的 `pi`**（PATH 上那一个），带 `--mode json --tools read,write -p <prompt>`。这会花时间和钱。

## 本课目标

看两段：纯导出如何切块；分析如何避免把 100k 字符一次性塞进 prompt。

`cwdToSessionDir`：`resolve(cwd)` 后把 `/` 换成 `-`，去掉前导 `-` 再包 `--...--`。与 cost.ts 的 encode 略有不同的实现，应对同一路径。若产品编码改了，这里又是第三份拷贝。

`parseSession` 用产品的 `parseSessionEntries`（从 `session-manager.ts` import）——比 cost.ts 手写 JSON.parse 更接近真实格式。只保留 user/assistant 的文本块，丢掉 tool 噪声。

切块：`MAX_CHARS_PER_FILE = 100_000`。单个会话超限就单独成文件并黄字 oversized。

## 文件做什么

### 默认

写 `./session-transcripts/session-transcripts-000.txt` 等。这个目录在 `.gitignore` 的 `plans/` 附近没有精确忽略；可能弄脏 git status。输出应用 `--output /tmp/...`。

### `--analyze`

对每个 txt spawn `pi`。JSON-mode 事件：`text_delta` 攒缓冲；`tool_execution_start` 时打印截断的工具行（read 显示 path/offset，write 显示 path）；`turn_end` 冲刷文本。子进程 cwd 是 outputDir，所以模型用 write 工具写 `*.summary.txt` 到旁边。

prompt 强制：1000 行一块 read 完整文件，再按固定模板写 PATTERN/STATUS/TYPE/FREQUENCY/EVIDENCE/DRAFT。只收出现 2+ 次的模式。然后对所有 summary 再 spawn 一次聚合到 `FINAL-SUMMARY.txt`。

会读 `~/.pi/agent/AGENTS.md` 和项目 `AGENTS.md`，让模型标 NEW vs EXISTING。

`chalk` 来自依赖图（coding-agent 或根 hoist）。脚本不在 tsconfig include 里，类型松。

## 关键逻辑

失败会怎样：

- PATH 上没有 `pi`：spawn error，该文件分析失败，继续下一个
- agent 没写 summary 文件：黄字警告。prompt 再强也防不住模型
- `--analyze` 用的是稳定/开发 pi 哪个取决于 PATH。可能分析器版本 ≠ 产生 JSONL 的版本
- 把 transcript 目录提交进 git：可能含用户代码和秘密。不要
- 与 AGENTS.md「从仓库根跑 agent」一致：本脚本 spawn 的 cwd 却是 outputDir，子 agent **看不到仓库根 AGENTS.md**（除非全局那份）。这是刻意让它读 transcript 而不是改本仓库；也会让它不遵守本仓的「不准 git add -A」——它只有 read/write 工具，没有 bash，风险受限

## 和启动链的关系

`--analyze` 真的启动产品 CLI（JSON 模式 + 白名单工具），走用户入口而不是 `pi-test.sh`。是「用 pi 分析 pi 的会话」。

## 下一课

上下文窗口占满了多少：[53-session-context-stats.mjs.md](/series/pi-source/root/057-session-context-stats-mjs/)。
