---
title: "07 · node.ts — Node 专用入口，把文件系统焊进来"
summary: "看清为什么默认入口不 export NodeExecutionEnv：避免把 node:fs / childprocess 带进浏览器或其它 runtime。这两行就是整个策略。"
tags: [pi, agent]
---
源码：`packages/agent/src/node.ts`  
被谁调用：`import ... from "@earendil-works/pi-agent-core/node"`。experimental session-worker、需要 `NodeExecutionEnv` 的测试。

## 本课目标

看清为什么默认入口不 export `NodeExecutionEnv`：避免把 `node:fs` / `child_process` 带进浏览器或其它 runtime。这两行就是整个策略。

## 在系统中的位置

```ts
export { NodeExecutionEnv } from "./harness/env/nodejs.ts";
export * from "./index.ts";
```

先 re-export 默认入口的全部符号，再单独挂上 Node 执行环境。harness 内置 read/write/edit/bash 的 `toolContext.env` 就是这个类。

现行 CLI 的 bash/read **不是** 这个 `NodeExecutionEnv`。coding-agent 有自己的 `core/tools`，走 Node API 但合同是 `AgentTool`，不经过 `ExecutionEnv`。

## 何时 import `./node`

- 你在 Node 里跑 `AgentHarness`，并且要用本包自带的 `createBashTool` / `createReadTool`。
- 你要实现自己的 `ExecutionEnv`，把这份当对照实现（课 78）。

纯 `new Agent` 的宿主继续 `from "@earendil-works/pi-agent-core"` 即可。

## 失败与边界

在非 Node bundler 里 import `./node` 会解析失败或把 fs polyfill 拉进来。这是分入口的原因，不是疏忽。

## 下一课

[08-search-index.ts.md](/series/pi-source/agent/249-search-index-ts/) 是主链目录里最后一份顶层文件，然后进入 harness。
