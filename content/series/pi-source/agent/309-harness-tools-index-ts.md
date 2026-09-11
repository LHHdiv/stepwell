---
title: "68 · tools/index.ts — 四个工厂的出口"
summary: "导出 createBashTool / createEditTool / createReadTool / createWriteTool 及类型，加上 ExecutionToolContext。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/index.ts`

导出 `createBashTool` / `createEditTool` / `createReadTool` / `createWriteTool` 及类型，加上 `ExecutionToolContext`。

**不**导出 `edit-diff`、`image`、`path-utils`、`file-mutation-queue`：那是工具内部。宿主只要四个 create*。

experimental worker 目前挂 read/write/bash，没挂 edit——不是包不会，是 worker 装配列表短。

这些工具的 `execute` 是 `AgentHarnessTool` 签名。塞进 `new Agent({ tools })` 类型不兼容（缺 signal 参数位）。CLI 主链继续用 coding-agent `core/tools`。

## 下一课

[69 · tool-context.ts](/series/pi-source/agent/310-harness-tools-tool-context-ts/)。
