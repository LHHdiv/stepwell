---
title: "106 · core/index.ts — 运行模式共享的对外桶"
summary: "再导出：AgentSession 及其 runtime/services、bash executor 类型、compaction 结果类型、event bus、experimental 开关、扩展公共 API、createSynthet"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/index.ts`  
被谁调用：`src/index.ts`（SDK）、modes、main 的部分 import。

再导出：AgentSession 及其 runtime/services、bash executor 类型、compaction 结果类型、event bus、experimental 开关、**扩展公共 API**、`createSyntheticSourceInfo`。

刻意不从这里导出：jiti loader 内部、tools 实现（SDK 从 `sdk.ts` 另开 `createReadTool`）、settings 全量、package-manager。扩展 `import "@earendil-works/pi-coding-agent"` 拿到的是更宽的 `src/index.ts`，包含本桶。

读完 core 这一圈，执行链回到 [11-agent-session.ts.md](/series/pi-source/coding-agent/477-agent-session-ts/) 的 `prompt`，然后进入 [agent/00-模块导读.md](/series/pi-source/agent/241-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)。
