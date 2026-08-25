---
title: 第41讲·compaction：自动压缩的三件套
summary: 精读 compaction.ts（970 行）：触发算法、保留策略、迭代式摘要——以及跨压缩的文件追踪。
objectives:
  - 读懂 shouldCompact 的触发公式
  - 理解"从最新往回找 cut point"的保留策略
  - 掌握跨压缩的文件操作累积机制
tags: [pi, compaction, 上下文工程]
keyPoints:
  - 触发公式：contextTokens > contextWindow - reserveTokens（默认保留 16k）
  - 保留最近 keepRecentTokens（默认 20k），之前的交给 LLM 生成结构化摘要
  - 文件操作列表跨压缩累积，避免重复读文件
---

pi 的压缩机制在 `core/compaction/` 三件套：`compaction.ts`（970 行，自动压缩纯函数）、`branch-summarization.ts`（分支摘要）、`utils.ts`（序列化与提示词）。文档 `docs/compaction.md` 有完整图解。

## 触发：一个干净的公式

compaction.ts 第 235 行（原文）：

```ts
export function shouldCompact(
  contextTokens: number,
  contextWindow: number,
  settings: CompactionSettings
): boolean {
  if (!settings.enabled) return false;
  return contextTokens > contextWindow - settings.reserveTokens;
}
```

**当前用量 > 窗口 - 预留量**。预留量默认 16384 token——给"压缩本身要调用的模型"留出工作空间（压缩也要调模型，也得有地方干活）。手动触发用 `/compact [指示]`，可以附带要求："压缩时重点保留数据库迁移的讨论"。

## 保留策略：从最新往回找 cut point

压缩不是"从头摘 要"，而是**从最新往回保留**：

1. 从最新消息往回累计 token，直到达到 `keepRecentTokens`（默认 20k）——这条边界叫 cut point；
2. cut point 之前的所有消息 + 上一次的压缩摘要，一起交给 LLM 生成新的结构化总结；
3. 追加一条 `CompactionEntry` 进会话（记住 `firstKeptEntryId` 边界）；
4. 之后请求模型时，只送 summary + kept 的最近消息。

**"最近的对话永远原文保留，越旧的信息压缩比越高"**——符合对话的信息价值分布：刚才说的最重要，三天前说的可以浓缩。

## 跨压缩的文件操作追踪

最精妙的细节：你在这个会话里 read/edit 过哪些文件，这个清单**跨越多次压缩持续累积**。实现：每次压缩时，从上一次的 kept 边界重新累计文件操作，合并进新摘要。

为什么重要？没有这个机制，压缩会"忘记"你改过哪些文件，模型可能重复读、甚至基于过期认知重复编辑。**压缩丢得掉对话细节，丢不掉工作状态**——这是 pi 压缩设计里最有职业素养的一笔。

## token 估算的务实主义

压缩前的 token 计数用 `chars/4` 启发式（图片按 4800 字符计）——不调 tokenizer API，接受误差。因为压缩触发不需要精确值，差个 10% 无伤大雅。**在不需要精确的地方主动放弃精确**，性能与简洁双收。

## 试一试

打开 compaction.ts 找到 `SUMMARIZATION_SYSTEM_PROMPT`（在 utils.ts）。读一遍官方要求摘要保留哪些板块——对照 dsh 第 24 讲的"四类信息"（目标/决策/事实/未完成），两个项目的要求有何异同？

## 下一讲预告
卷六（终卷）：扩展系统。ExtensionAPI 的 35 种事件、registerTool/registerCommand——以及 pi 如何让智能体"自我扩展"。
