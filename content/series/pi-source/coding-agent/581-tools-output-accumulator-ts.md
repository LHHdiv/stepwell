---
title: "63 · output-accumulator.ts — 流式 shell 输出的有界内存"
summary: "命令可能打印数 GB。本类只在内存留大约 2 maxBytes 的解码尾巴，超限把 原始 Buffer 写到 tmp。snapshot 对尾巴 truncateTail，并填 totalLines/totalBytes 为全局计数（不是"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/output-accumulator.ts`  
被谁调用：bash/powershell `execute`。

## 本课目标

命令可能打印数 GB。本类只在内存留大约 `2 * maxBytes` 的解码尾巴，超限把 **原始 Buffer** 写到 tmp。`snapshot` 对尾巴 `truncateTail`，并填 `totalLines/totalBytes` 为全局计数（不是尾巴长度）。

`append(Buffer)`：流式 `TextDecoder`。`finish()` 刷 decoder。`closeTempFile()` await stream end。`persistIfTruncated` 时才确保 tmp 存在，避免短命令落盘。

`getLastLineBytes` 给「单行超限」文案。

## 和 executeToolCalls 的关系

`onUpdate` 每 100ms 拿 snapshot → loop `tool_execution_update` → TUI 刷新。最终 execute 返回值再 snapshot 一次。abort 后 bash 仍 `finishOutput`，模型能看到半截输出 + `Command aborted`。

## 下一课

[64-tools-tool-definition-wrapper.ts.md](/series/pi-source/coding-agent/582-tools-tool-definition-wrapper-ts/)。
