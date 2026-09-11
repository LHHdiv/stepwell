---
title: "46 · profile-coding-agent-node.mjs — 量 TUI/RPC 启动要多少毫秒"
summary: "看它如何定义「启动完成」："
tags: [pi, root]
---
源码：`scripts/profile-coding-agent-node.mjs`  
被谁调用：`npm run profile:tui` / `profile:rpc`；也可 `bun run profile:*`（用 user agent 检测 runtime）。维护者优化启动时用，不进 check。

## 本课目标

看它如何定义「启动完成」：

- **tui**：子进程必须在真实 TTY 里跑，环境 `PI_STARTUP_BENCHMARK=1` `PI_TIMING=1`，coding-agent 画到第一帧可用后自行退出。脚本用墙钟和 stderr 里 `--- Startup Timings ---` 块。
- **rpc**：stdin 写一行 `{"id","type":"get_state"}`，收到 matching `response` 且 `success: true` 的瞬间算完成，然后 `stdin.end()` 让进程退出。

比较的是「用户等到能交互 / 能 RPC」的时间，不是 `node -e` 的 import 时间。

## 在仓库中的位置

```text
Node: 先 npm run build（依赖若干 workspace + coding-agent 的 build 或 build:unbundled）
      跑 dist/cli.js 或 --bundle 时 dist/bundle/cli.js
Bun:  不 build，直接 bun src/cli.ts
默认 PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1，避免网络和更新检查污染
默认使用你的真实 PI_CODING_AGENT_DIR（模型/auth 影响启动）
--isolated-agent-dir 才用临时目录
```

`--cpu-profile` 加 Node/Bun 的 `--cpu-prof*`，产物默认 `profiles-node/` 或 `profiles-bun/`（gitignore 了 `*.cpuprofile`）。缺 profile 文件当失败。

若 `--skip-build` 且 `dist/cli.js` 内容含 `import "./bundle/cli.js"`（bundled facade），throw：你以为在测未打包入口，其实在测 bundle。

## 文件做什么

`parseStartupTimings` 扫 stderr 中 `Label: 123ms` 行，多 run 后算 min/max/avg/median。TUI warmup 与 measured 分开。RPC 用 `splitJsonLines` 处理粘包。

`createBenchmarkEnv` 拷贝 `process.env` 再改——**不像 test.sh 那样清空**。本机的 API key 仍在。所以这是性能工具不是正确性测试。

TUI 模式要求 `stdin/stdout.isTTY`。在 CI 或重定向里跑会立刻 throw。

## 关键逻辑

失败会怎样：

- 交互 UI 没实现 STARTUP_BENCHMARK 退出：子进程挂着，脚本等到你 Ctrl+C
- RPC 一直不回 get_state：throw did not receive
- 用真实 agent dir：第一次加载巨大 models.json 会进测量。对比时两边要用同一 --agent-dir
- bun 与 node 数字不能直接比：一个是源码 tsx 等价，一个是编译 JS

## 和启动链的关系

它启动的是 **发布入口 `cli.ts`**（或 bundle），不是 `experimental/cli.ts`。和 Windows `pi-test.ps1` 同一入口。测的是用户感知启动，不是课表源码入口。

## 下一课

一次性把相对导入改成 `.ts`：[47-update-source-imports-to-ts.sh.md](/series/pi-source/root/051-update-source-imports-to-ts-sh/)。
