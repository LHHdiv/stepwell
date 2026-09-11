---
title: "05 · index.ts — 包的门面，两套 API 从这里挤出去"
summary: "分清「主链真正用到的符号」和「harness 为了以后/实验宿主提前挂在默认入口上的符号」。读 export 列表，不要假设 CLI 会 new 一个 AgentHarness。"
tags: [pi, agent]
---
源码：`packages/agent/src/index.ts`  
被谁调用：所有 `from "@earendil-works/pi-agent-core"`。`package.json` 的 `exports["."]` 指向编译后的这份文件。

## 本课目标

分清「主链真正用到的符号」和「harness 为了以后/实验宿主提前挂在默认入口上的符号」。读 export 列表，不要假设 CLI 会 new 一个 `AgentHarness`。

## 在系统中的位置

```text
@earendil-works/pi-agent-core          → dist/index.js  【本文件】
@earendil-works/pi-agent-core/node     → dist/node.js   【再 export NodeExecutionEnv】
./harness/session                      → session/index
./harness/session/testing              → 测试夹具
./harness/env/nodejs
./harness/runtime/reducer
./harness/context
```

默认入口已经 `export * from "./harness/agent-harness.ts"` 和 `session/index.ts`。子路径是给不想拖进整包表面的调用方用的，不是「harness 还没正式发布」。

## 分组读 export

1. **telemetry 再导出**：从 `@earendil-works/pi-telemetry` 拉 `defineTelemetrySchema`、`InMemoryTelemetryContext`、`NOOP_TELEMETRY_CONTEXT` 和一堆属性类型。coding-agent / server 可以只依赖 agent-core 就能写 span。
2. **主链**：`./agent.ts`、`./agent-loop.ts`、`./types.ts`、`setDefaultStreamFn`、`./proxy.ts`。
3. **harness 运行时**：`agent-harness.ts`（`AgentHarness.create`、`AgentLane`、事件/钩子类型）、`runtime/reducer.ts` 的 `reduceLaneSnapshot`。
4. **压缩算法**：从 `compaction/*.ts` 点名导出 `compact`、`prepareCompaction`、`generateBranchSummary` 等。coding-agent 现行压缩走自己的 `core/compaction`，但类型和算法实现已经在 core 里一份。
5. **会话**：`session/index.ts` 的 `StorageBackedSession`、`MemorySessionRepo`、`JsonlSessionRepo`、values 地址。
6. **工具与执行环境类型**：`harness/types.ts` 里的 `FileSystem` / `Shell` / `AgentHarnessTool`、以及 `tools/index.ts` 的 `createReadTool` 等。
7. **search**：`./search/index.ts`，目前只有接口。

注意：`export * from "./harness/agent-harness.ts"` 会把 `Closed`、`LaneBusy` 等 tagged error 和 `result.ts` 里同名 re-export 叠在一起。`agent-harness.ts` 自己又从 `result.ts` re-export 一次。对调用方是同一份类。

`uuidv7` 从 `@earendil-works/pi-ai` 再导出：会话 entry id、operation id 都用它，时间前缀可排序。

## 故意没从默认入口出去的

- `getDefaultStreamFn`：内部用。
- `NodeExecutionEnv`：放在 `./node`，避免把 `node:fs` / `spawn` 拉进非 Node bundler。
- `createAgentHarness` 实现类 `Harness`：只通过 `AgentHarness.create`。
- `session/testing`：正式包有独立 export 路径，测试和 benchmark 才该碰。

## 失败与边界

从默认入口 `import { Agent }` 在 TypeScript 里会看到 `AgentHarness`。这不代表 CLI 构造了它。读 coding-agent 时以 `sdk.ts` 的实际 import 为准。

## 下一课

[06-proxy.ts.md](/series/pi-source/agent/247-proxy-ts/)：一个真正的 `StreamFn` 实现，主链可选。然后 [07-node.ts.md](/series/pi-source/agent/248-node-ts/) 只有两行，再进 search 骨架。harness 从 [09](/series/pi-source/agent/250-harness-agent-harness-ts/) 开读。
