---
title: "69 · tools/tool-context.ts — 内置工具只要 env"
summary: "六行。createReadTool<TContext extends ExecutionToolContext>() 所以宿主可以 toolContext: { env, extra: ... } 扩字段，内置工具只解构 env。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/tool-context.ts`

```ts
export interface ExecutionToolContext {
  env: ExecutionEnv;
}
```

六行。`createReadTool<TContext extends ExecutionToolContext>()` 所以宿主可以 `toolContext: { env, extra: ... }` 扩字段，内置工具只解构 `env`。

没有 env 就无法跑四个工厂。测试假 env 也必须实现 FileSystem+Shell。

## 下一课

[70 · path-utils.ts](/series/pi-source/agent/311-harness-tools-path-utils-ts/)。
