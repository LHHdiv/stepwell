---
title: "54 · tools/edit.ts — 精确替换"
summary: "每条 oldText 必须在原始文件上唯一且互不重叠。guideline 要求：多处改动用一次 call 多个 edits，不要重叠；oldText 尽量短但唯一。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/edit.ts`  
被谁调用：默认四件套。算法在 `edit-diff.ts`。

## schema

```ts
{
  path: string,
  edits: Array<{ oldText: string, newText: string }>
}
```

每条 `oldText` 必须在**原始文件**上唯一且互不重叠。guideline 要求：多处改动用一次 call 多个 edits，不要重叠；oldText 尽量短但唯一。

`prepareArguments`：有的模型把 `edits` 打成 JSON 字符串或单个对象；旧字段 `oldText`/`newText` 顶层会推进数组。这发生在 schema 校验前。

`renderShell: "self"`：TUI 自己画 diff，不用标准工具外壳。

## execute 副作用

mutation queue → access(R_OK|W_OK) → 读全文 → 剥 BOM → 检测 `\r\n` vs `\n` → 规范化 LF → `applyEditsToNormalizedContent` → 恢复换行与 BOM → 写回。

匹配：先精确，再 fuzzy（尾空白、Unicode 引号/破折号）。fuzzy 时只把改动行覆回原字节，未改行保持原样。任一 oldText 找不到、不唯一、空、替换后无变化 → throw，**不写盘**（queue 内 throw 在 write 前）。

details：`diff`（展示）、`patch`（unified）、`firstChangedLine`。content 只有一句成功计数。

abort 策略与 write 相同：不在 listener reject。

## 截断

不截断文件。巨大 diff 只存在 details 里给 TUI；送给模型的成功消息很短。失败 throw 的 message 会进 toolResult 文本，模型靠它改 oldText。

## 和 executeToolCalls 的关系

与 write 同队列。并行两个 edit 同一文件：第二个看到第一个写完后的内容，但 edits 按「原始文件」匹配——若 loop 并行启动时都已读到同一旧内容，queue 会串行执行两次，第二次可能因 oldText 已变而失败。这是并行 toolCall 的固有风险；模型应一次 call 里放多个 edits。

length 截断的半个 oldText：不执行，避免乱替换。

## 下一课

[55-tools-bash.ts.md](/series/pi-source/coding-agent/565-tools-bash-ts/)。
