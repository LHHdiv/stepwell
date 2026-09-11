---
title: "01 · README.md — 评测怎么写、怎么比"
summary: "README 不是空话。它规定了几条方法学，实现都按这个写："
tags: [pi, evals]
---
源码：`packages/evals/README.md`  
被谁当文档：包用户（内部）；本课把它当「产品说明对照源码」读，后面文件是它的实现。

## 本课目标

README 不是空话。它规定了几条**方法学**，实现都按这个写：

1. 一个 `describeEval` 绑一个 harness
2. 比较实验用 `evalHarnessTable` + `describe.for`，`judgeThreshold: null` 让低分不当 vitest 失败
3. 硬断言只留给基础设施不变量；`expect.soft` 仍会 fail 测试，不是打分器
4. harness 名在一个 eval set 内稳定唯一；分组键 = repetition + `input.id` 或 canonical JSON 的 sha256

## 和源码的对应

| README 说法 | 实现 |
|---|---|
| `createPiCodingAgentHarness` | `src/pi-harness.ts` |
| reload 步骤 | `run([{type:"prompt"},{type:"reload"},...])` |
| `output` 变换 | harness options.output |
| `evalHarnessTable` | `src/vitest-evals/harness-table.ts` |
| pass-rate lift、token/latency/cost delta | `summary.ts` + reporter 打印 |
| `.eval/` JSONL 附件 | `run-evals.mjs` 建目录；`artifacts.ts` 落盘；`reporter.ts` 写 `runs.jsonl` |
| afterEach 注册 snapshot | `setup.ts` |

「score ≥ 1 算 pass」写在 `summarizeCorrectness`。judge 返回 0/1 时 lift 才有意义。

比较方法学外链 `skill-eval-harness`：重复次数、可信 judge、遥测解释。本仓库的 `extensions.eval.ts` 是一份最小对照（无文档提示 vs 默认提示）。

## 失败与边界

README 说「CLI 值成为未显式选模型的 harness 的默认」。`resolveModelSelection` 实现正是：显式 `options.model` > `PI_PROVIDER`/`PI_MODEL`。runner 把 CLI 写进 child env。

「允许没有默认，当每个执行的 harness 自己配模型」：runner 在没给成对参数时 delete 两个 env。当前三份 eval 没有 harness 级 model，所以不给参数会在 `runPiCodingAgent` 里 throw。

## 下一课

进程入口如何把 CLI 变成 vitest 子进程：[02-scripts.run-evals.mjs.md](/series/pi-source/evals/727-scripts-run-evals-mjs/)。
