---
title: "04 · vitest-evals/setup.ts — afterEach 挂上会话快照"
summary: "vitest-evals 把 harness.run 放在 task.meta.harness.run。reporter 读 artifact 时必须已经 recordArtifact。afterEach 在 reporter 的 on"
tags: [pi, evals]
---
源码：`packages/evals/src/vitest-evals/setup.ts`（8 行）  
谁加载它：`vitest.config.ts` 的 `setupFiles`。只对 eval 运行生效，单元测试配置没有这项。

## 本课目标

vitest-evals 把 `harness.run` 放在 `task.meta.harness.run`。reporter 读 artifact 时必须已经 `recordArtifact`。afterEach 在 reporter 的 `onTestCaseResult` 之前把 Pi 的 JSONL 登记到 **明确的测试 task** 上。

```ts
afterEach(async ({ task }) => {
  const run = task.meta.harness?.run;
  if (run) await recordEvalSessionArtifact(task, run);
});
```

没有 harness 的测试（本包 eval 文件里目前都有）跳过。`import type {} from "vitest-evals"` 是为了把 `task.meta.harness` 的类型 augmentation 拉进来。

## 失败与边界

- `recordEvalSessionArtifact` 在 artifact 元数据形状不对时 throw，afterEach 失败会让该测试 fail——这是有意的，丢会话文件比静默更糟。
- setup 不建 `.eval/` 目录。落盘在 reporter 里，用 `PI_EVAL_ARTIFACT_DIR`。

## 下一课

artifact 类型和写盘：[05-vitest-evals.artifacts.ts.md](/series/pi-source/evals/730-vitest-evals-artifacts-ts/)。
