---
title: "09 · smoke.eval.ts — 无工具端到端冒烟"
summary: "这不是「测模型聪不聪明」。它测 焊点还活着：ModelRuntime 能拿到指定模型、session.prompt 能回来、usage 统计非零、错误数组空。首都问题是固定、低成本、答案唯一。"
tags: [pi, evals]
---
源码：`packages/evals/src/smoke.eval.ts`（18 行）  
被谁运行：`npm run eval` 默认 include 所有 `*.eval.ts`。

## 本课目标

这不是「测模型聪不聪明」。它测 **焊点还活着**：ModelRuntime 能拿到指定模型、session.prompt 能回来、usage 统计非零、错误数组空。首都问题是固定、低成本、答案唯一。

## 逐段

```ts
const piCodingAgentHarness = createPiCodingAgentHarness({ noTools: "all" });
```

`noTools: "all"` 连扩展工具都不注册（临时目录本来也没有扩展）。模型不能 bash 出巴黎，只能靠参数记忆。

`describeEval("Pi Coding Agent smoke", { harness }, it => { ... })`：vitest-evals 提供 `run`。prompt 要求 only the city name。

断言：

- `result.output.trim() === "Paris"` — 硬断言。模型若啰嗦，这条 fail。这是基础设施+指令遵循的双重烟测。
- `result.errors` 空
- `usage.provider/model` 等于 env（证明 runner 把默认灌进了没写死 model 的 harness）
- `totalTokens > 0` — 真的打了电话，不是空跑

没有 judge。失败就是 vitest fail。不进比较报表。

## 失败与边界

- 模型改口「Paris, France」会 fail。要测「是否调用成功」而不是拼写，应放宽断言或用 judge。当前有意收紧。
- timeout 继承 120s。极慢的厂家可能踩线。
- 会花真实钱。CI 需要密钥和预算。

## 下一课

用 Agent 当审计员：[10-docs.eval.ts.md](/series/pi-source/evals/735-docs-eval-ts/)。
