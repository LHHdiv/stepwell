---
title: "17 · file-processor.ts — `@file` 变成文本和图片"
summary: "指出：这是启动时读用户点名的文件，不是 read 工具。失败 process.exit(1)。图片进 ImageContent，文本包进 <file name=\"绝对路径\">。空文件静默跳过。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/file-processor.ts`  
被谁调用：`main.ts` 的 `processFileArguments(parsed.fileArgs)`；`parseArgs` 把 `@path` 推进 `fileArgs`。

## 本课目标

指出：这是启动时读用户点名的文件，**不是** read 工具。失败 `process.exit(1)`。图片进 `ImageContent`，文本包进 `<file name="绝对路径">`。空文件静默跳过。

## 在系统中的位置

```text
parseArgs: @README.md → fileArgs
main: processFileArguments(fileArgs)
  → { text, images }
buildInitialMessage 把 text 拼进第一句 prompt
session.prompt(initialMessage, { images })
```

路径解析用 `resolveReadPath`（与 read 工具同一套 macOS 截图 Unicode 变体），再 `path.resolve` 成绝对路径。cwd 是 `process.cwd()`，不是会话将来的 cwd。

## `processFileArguments` 逐步

对每个 `fileArg`：

1. `resolveReadPath` + `resolve`。
2. `access` 失败：红字 `File not found`，`exit(1)`。
3. `stat.size === 0`：continue，不占 prompt。
4. `detectSupportedImageMimeTypeFromFile`：
   - 是图：`readFile` → `processImage`（默认缩到 2000×2000）。失败则把 `processed.message` 当文本文件块；成功 push `ImageContent`，文本侧仍写一个空的或带 hints 的 `<file>`，让模型知道附件对应哪条路径。
   - 不是图：UTF-8 `readFile` + `stripBom`，整份包进 `<file>`。读失败 `exit(1)`。

`autoResizeImages` 默认 true，与设置 `images.autoResize` 在工具路径上的开关是两套：CLI 附件走这里的 options，main 会按设置传入。

## 失败与边界

找不到/读不了直接杀进程，不进 diagnostics 数组。多文件按 argv 顺序拼接。二进制非图片当 UTF-8 读，可能得到乱码文本——没有 magic-byte 拦网。图片成功时模型同时看到文本标签和 image block。

## 下一课

[18-initial-message.ts.md](/series/pi-source/coding-agent/490-initial-message-ts/)：stdin、`@file`、第一条 CLI 消息如何合成一句。
