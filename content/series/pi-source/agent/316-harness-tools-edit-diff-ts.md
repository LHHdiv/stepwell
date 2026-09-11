---
title: "75 · tools/edit-diff.ts — 模糊匹配与补丁字符串"
summary: "detectLineEnding 看谁先出现。normalizeToLF / restoreLineEndings。匹配在 LF 上进行，写回保持 CRLF 文件的 CRLF。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/edit-diff.ts`  
被谁调用：仅 edit.ts。依赖 npm `diff`。

## 换行

`detectLineEnding` 看谁先出现。`normalizeToLF` / `restoreLineEndings`。匹配在 LF 上进行，写回保持 CRLF 文件的 CRLF。

## `normalizeForFuzzyMatch`

NFKC、去行尾空白、弯引号→ASCII、各种 dash→`-`、各种 Unicode 空格→普通空格。精确找不到时用归一后的文本定位，再映射回原偏移。

## `applyEditsToNormalizedContent`

对每个 edit 在原文找 oldText：精确 → 模糊。找不到/多处匹配/与其它 edit 行区间重叠 → throw，消息里带 path。全部定位后再从后往前替换（避免偏移作废）。返回 `{ baseContent, newContent }` 都是 LF。

`generateDiffString` / `generateUnifiedPatch` 给 details，不是再写盘。

## 失败与边界

模糊匹配可能对上「看起来像但不该改」的段落——这是以模型体验换严格性。重叠检测按行 span，同一行两处不重叠的精确替换仍可能被行级检测拒绝，注释要求合并。

## 下一课

[76 · bash.ts](/series/pi-source/agent/317-harness-tools-bash-ts/)。
