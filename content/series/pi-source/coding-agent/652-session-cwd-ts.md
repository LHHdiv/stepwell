---
title: "99 · session-cwd.ts — 会话记下的目录已经没了"
summary: "header.cwd 不存在时，print/rpc 应早已 exit；若仍走进 runtime 工厂则 throw MissingSessionCwdError。formatMissingSessionCwdPrompt 给启动选择器。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/session-cwd.ts`  
被谁调用：`createAgentSessionRuntime` 的 `assertSessionCwdExists`；main 在交互里先问要不要用当前 cwd。

header.cwd 不存在时，print/rpc 应早已 exit；若仍走进 runtime 工厂则 throw `MissingSessionCwdError`。`formatMissingSessionCwdPrompt` 给启动选择器。没有 sessionFile 的内存会话不检查。

## 下一课

[100-session-export.ts.md](/series/pi-source/coding-agent/654-session-export-ts/)。
