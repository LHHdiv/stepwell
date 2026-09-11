---
title: "32 · jsonl/index.ts — 三行再导出"
summary: "不导出 codec / io / fork / legacy-v3：那些是存储内部。Repo 使用者只要 JsonlSessionRepo + metadata 类型 + JSONLSTORAGEVERSION。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/session/jsonl/index.ts`

```ts
export * from "./repo.ts";
export * from "./storage.ts";
export * from "./types.ts";
```

不导出 `codec` / `io` / `fork` / `legacy-v3`：那些是存储内部。Repo 使用者只要 `JsonlSessionRepo` + metadata 类型 + `JSONL_STORAGE_VERSION`。

`fork.ts` 由 repo.fork 内部调用。测试若要单测 codec，从相对路径进，不从包出口。

## 下一课

[33 · jsonl/types.ts](/series/pi-source/agent/274-harness-session-jsonl-types-ts/)。
