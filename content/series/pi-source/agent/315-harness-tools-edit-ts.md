---
title: "74 · tools/edit.ts — 对原文件做多段唯一替换"
summary: "prepareArguments：edits 若是 JSON 字符串则 parse；单个 {oldText,newText} 包成数组；遗留顶层 oldText/newText 推进 edits。模型经常把数组序列化成字符串。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/edit.ts`

## 参数兼容

`prepareArguments`：`edits` 若是 JSON 字符串则 parse；单个 `{oldText,newText}` 包成数组；遗留顶层 oldText/newText 推进 edits。模型经常把数组序列化成字符串。

空 edits throw。

## execute

mutation queue → fileInfo 必须是 file 或 symlink → readTextFile → 剥 BOM、记换行、归一 LF → `applyEditsToNormalizedContent`（课 75）→ 恢复换行+BOM → writeFile。返回成功句 + details.diff / unified patch / firstChangedLine。

每一段 oldText 必须在 **原始** 归一文本上唯一且互不重叠，不是顺序应用。两处改邻近行应合并成一次 edit。

## 失败与边界

symlink 当 file 读/写：跟不跟链由 FileSystem.readTextFile 决定（Node lstat 不跟，read 通常跟）。abort 在读、apply、写之间检查。

## 下一课

[75 · edit-diff.ts](/series/pi-source/agent/316-harness-tools-edit-diff-ts/)。
