---
title: "08 · vitest-evals/reporter.ts — `runs.jsonl` 和比较报表"
summary: "分清两个时机：onTestCaseResult 追加一行索引；onTestRunEnd 扫全部模块做 lift。读完应能打开一份 runs.jsonl 指出字段从哪来。"
tags: [pi, evals]
---
源码：`packages/evals/src/vitest-evals/reporter.ts`  
核心导出：default class `EvalHarnessReporter`  
谁加载它：`vitest.config.ts` `reporters: ["vitest-evals/reporter", "./src/vitest-evals/reporter.ts"]`。前面那个是 vitest-evals 自带（judge 分数）；本文件是 Pi 附加。

## 本课目标

分清两个时机：`onTestCaseResult` 追加一行索引；`onTestRunEnd` 扫全部模块做 lift。读完应能打开一份 `runs.jsonl` 指出字段从哪来。

## `appendHarnessRunReport`

没有 `PI_EVAL_ARTIFACT_DIR` 则 no-op（直接跑 `vitest --config vitest.config.ts` 而不经 `run-evals.mjs` 时不会落盘）。

记录：

```ts
{
  schemaVersion: 1,
  runId,                    // artifacts.runId 或随机 UUID
  test: { id, file, name, fullName, status },
  harness: harness.name,
  usage, timings?, errors?,
  artifacts: persistEvalArtifactReferences(...),  // [{name, path}]
  metadata?                 // 其余 artifacts，去掉 runId 和 jsonl 正文
}
```

`flag: "a"` 追加。mode 0600。目录 mkdir 0700。

iteration artifact 在 metadata 里（键 `vitestEvalsHarnessIteration`），比较报表从 **test modules 现场观察** 收，不从 jsonl 再读一遍——进程内更全，包括没写盘的。

## `collectHarnessObservations`

遍历 `module.children.allTests()`。没有 iteration artifact 的 run（smoke/docs）不进比较，只进 jsonl。score 来自 `test.meta().eval?.avgScore`（vitest-evals 写入）。有 `run.errors` 则 outcome errored，不管 vitest 状态。无 score 时按 `passed → unscored`、`failed → errored`。

## `onTestRunEnd`

`reason === "interrupted"`（Ctrl-C）打印一句 unavailable，不算半截 lift。否则 format 后 `vitest.logger.log`。

## 失败与边界

- persist 失败会让 `onTestCaseResult` reject，vitest 当 reporter 错误。磁盘满时你想知道。
- 并行文件已在 config 关掉。若打开，jsonl 多进程 append 可能交错半行——当前安全。
- default export class，vitest 用 `new`。

## 下一课

最瘦的行为课：[09-smoke.eval.ts.md](/series/pi-source/evals/734-smoke-eval-ts/)。
