---
title: "83 · utils/shell-output.ts — 只要最终有界视图的兼容层"
summary: "给「不想自己拼 ShellOutputUpdate」的调用方。内部仍 env.exec + spill + adaptive。onChunk 只在 append/slide 或首次 replace 时给增量，避免 metadata 更新"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/utils/shell-output.ts`

## `executeShellWithCapture`

给「不想自己拼 ShellOutputUpdate」的调用方。内部仍 `env.exec` + spill + adaptive。`onChunk` 只在 append/slide 或首次 replace 时给增量，避免 metadata 更新把整窗再报一遍。

结果：output、truncation、spillPath、exitCode、cancelled、truncated。abort → ok 且 cancelled（不是 err），方便 UI 显示已有输出。`returnExecutionErrors` 时 spawn 失败也 ok 并带 `executionError`。

`sanitizeBinaryOutput` 再导出 sanitize。

## 失败与边界

这是兼容采集器。harness bash 工具 **不**走这里，直接 onUpdate。coding-agent 旧 bash 若迁到 ExecutionEnv 可以走这个函数少改调用方。

## 下一课

agent 包源码精读到此结束。

- 跟现行 CLI：回到 [docs/study/README.md](/series/pi-source/prelude/000-%E6%80%BB%E5%AF%BC%E8%AF%BB/)，下一刀 `packages/ai` 的 `streamSimple` 或 coding-agent `core/tools/`。
- 跟可恢复运行时：对照 `packages/agent/docs/harness.md` Part 3–4，单步 `test/harness/runtime/drive-*.test.ts`。
- 实验宿主：`packages/coding-agent/src/experimental/session-worker.ts` 的 `createCodingAgentHarness`。
