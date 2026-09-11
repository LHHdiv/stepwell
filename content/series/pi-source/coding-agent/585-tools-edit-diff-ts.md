---
title: "65 · tools/edit-diff.ts — 替换算法和 diff 文本"
summary: "所有 edits 对着同一份 LF 原文匹配，再按 index 从后往前 应用，避免前面替换移动后面偏移。任一失败整次 abort。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/edit-diff.ts`  
被谁调用：`edit.ts` execute；TUI 预览 `computeEditsDiff`。

## 本课目标

所有 edits 对着**同一份** LF 原文匹配，再按 index **从后往前** 应用，避免前面替换移动后面偏移。任一失败整次 abort。

`fuzzyFindText`：精确 `indexOf`；失败则规范化尾空白和 Unicode 标点后再找。fuzzy 命中后 `applyReplacementsPreservingUnchangedLines` 把改动行贴回原内容，未改行字节不变。

唯一性：`countOccurrences` 在 fuzzy 空间数，>1 throw。空 oldText throw。应用后 `newContent === baseContent` throw。

`generateDiffString` / `generateUnifiedPatch` 给 details 和 HTML 导出。不写盘。

## 和 executeToolCalls 的关系

纯函数。副作用全在 edit.ts 的 writeFile。并行两次 edit 的竞态由 mutation queue 管，本文件不管。

## 下一课

[66-tools-render-utils.ts.md](/series/pi-source/coding-agent/587-tools-render-utils-ts/)。
