---
title: "102 · source-info.ts — 资源来自哪里"
summary: "SourceInfo：path、source 字符串（npm:foo、local、cli、builtin）、scope user|project|temporary、origin package|top-level、可选 baseDir"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/source-info.ts`

`SourceInfo`：path、source 字符串（`npm:foo`、`local`、`cli`、`builtin`）、scope `user|project|temporary`、origin `package|top-level`、可选 baseDir。

`createSourceInfo` 从包管理 `PathMetadata` 拷。`createSyntheticSourceInfo` 给内置工具 `<builtin:read>`、SDK 工具、显式路径。TUI 配置选择器和冲突诊断用这些字段，不参与模型上下文。

## 下一课

[103-telemetry.ts.md](/series/pi-source/coding-agent/660-telemetry-ts/)。
