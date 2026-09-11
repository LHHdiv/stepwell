---
title: "41 · runtime/index.ts — 一行：createAgentHarness"
summary: "agent-harness.ts 写 export const AgentHarness = { create: createAgentHarness }。外部只 cop AgentHarness.create，不 new Harnes"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/runtime/index.ts`

```ts
export { createAgentHarness } from "./harness.ts";
```

`agent-harness.ts` 写 `export const AgentHarness = { create: createAgentHarness }`。外部只 cop `AgentHarness.create`，不 new `Harness` 类（类没从这导出）。

reducer 故意走 `package.json` 的 `./harness/runtime/reducer` 子路径，给远程 transcript 消费者单独 import，不必加载整份 drive。

## 下一课

[42 · runtime/types.ts](/series/pi-source/agent/283-harness-runtime-types-ts/)：Drive 对象和 command 代数。
