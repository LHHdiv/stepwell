---
title: "02 · scripts/run-evals.mjs — eval 子进程入口"
summary: "这不是 vitest 配置。它负责：解析 --provider/--model、建本次 artifact 目录、把环境变量灌进 vitest 子进程。读完应能指出 CLI 与 env 的优先级，以及为什么要用 spawnSync(pro"
tags: [pi, evals]
---
源码：`packages/evals/scripts/run-evals.mjs`  
谁加载它：`package.json` 的 `"eval": "node scripts/run-evals.mjs"`。

## 本课目标

这不是 vitest 配置。它负责：解析 `--provider`/`--model`、建本次 artifact 目录、把环境变量灌进 vitest 子进程。读完应能指出 CLI 与 env 的优先级，以及为什么要用 `spawnSync(process.execPath, [vitest.mjs, ...])` 而不是 `npx vitest`。

## 逐步

1. `packageRoot` = scripts 的上一级。artifact 目录：`PI_EVAL_ARTIFACT_DIR` 若已有（递归？通常没有）则 resolve 到包根相对路径；否则 `.eval/<ISO时间去冒号>_<uuid>`。时间里的 `:` 在 Windows 文件名非法，所以 replace。
2. 扫描 argv：`--provider` / `--model` 及 `--provider=` 形式吃掉，其余进 `vitestArgs`。缺 value 或 value 以 `-` 开头 → exit 1。
3. 一旦出现任一 CLI 模型相关旗标，`hasCliModelSelection=true`，必须 **两个都有**。否则（纯 env）`PI_PROVIDER` 与 `PI_MODEL` 必须同时有或同时无。
4. `createRequire` + `require.resolve("vitest/package.json")` 找到安装位置，旁路 `vitest.mjs`。保证用 workspace 锁住的 vitest，不被 PATH 上另一份抢。
5. `mkdirSync(artifactDirectory, { mode: 0o700 })`。stderr 打 default-model 和 artifacts 路径（stdout 留给 vitest）。
6. child env：拷贝 `process.env`，写入 `PI_EVAL_ARTIFACT_DIR`；有模型则写两个 PI_*，否则 **delete** 它们——避免外壳残留的半套变量骗过「同时有」。
7. `spawnSync(..., { cwd: packageRoot, stdio: inherit })`。exit 用子进程 status，异常 throw。

vitest 配置写死 `"vitest.config.ts"`：`include: src/**/*.eval.ts`，`fileParallelism: false`（模型调用不要并行打爆限额），timeout 120s/钩子 30s，reporters 含 vitest-evals 自带 + 本包 `EvalHarnessReporter`。

## 失败与边界

- 本脚本不验证厂家名是否存在。错模型名在 harness 里 `getModel` 返回 undefined 才 throw。
- `PI_EVAL_ARTIFACT_DIR` 若指向已存在的脏目录，新的 `runs.jsonl` 会 append。CI 应每次给新路径。
- 没有 `--help`。未知旗标进 vitest，vitest 再抱怨。

## 下一课

真正跑 Agent 的适配器：[03-pi-harness.ts.md](/series/pi-source/evals/728-pi-harness-ts/)。
