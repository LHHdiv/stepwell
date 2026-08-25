---
title: 第11讲·消息词汇表：Message、ContentBlock 与流式分片
summary: 精读 llm 包的 content.ts 与 message.ts——搞懂"一条 AI 消息"在 dsh 里到底长什么样。
objectives:
  - 说出 Message 的三种角色和 ContentBlock 的主要种类
  - 理解为什么"一张图片/一次工具调用"不是字符串而是结构化块
  - 理解 StreamChunk 为什么存在
tags: [deepseek-harness, llm, 数据结构]
keyPoints:
  - 消息按角色分三类：User / Assistant / ToolResult
  - 消息内容是 ContentBlock 数组：文本、图片、工具调用等可以混排
  - 流式响应被切成 StreamChunk 序列，边生成边送达
---

上一讲我们有了 ID 印章，现在给印章找盖的对象。打开 `packages/llm/llm/src/content.ts` 和 `message.ts`——这两个文件定义了 dsh 的"对话词汇表"，后面所有模块说的"话"都是这些词。

## 消息的三种角色

对话由消息组成，每条消息有一个角色。dsh 把角色收敛为三类（定义在 message.ts）：

| 角色 | 谁在说 | 例子 |
|---|---|---|
| `UserMessage` | 用户（或代表用户的程序） | "帮我看看这个报错" |
| `AssistantMessage` | 模型 | "好的，我需要先读一下文件" + 工具调用 |
| `ToolResultMessage` | 工具执行结果的回传 | 文件内容、命令输出 |

对比你熟悉的聊天界面：界面上只有"我"和"AI"两种气泡，但 dsh 里多了 `ToolResult` 这一类——因为智能体对话里，**工具说的话也要占一席之地**，它们和人类的话一起排队进入模型视野。

## 内容为什么不是字符串，而是"块"的数组？

看 AssistantMessage 的内容字段，它的类型不是 `string`，而是 `ContentBlock[]`。ContentBlock（定义在 content.ts）大致是这样一个判别联合：

```ts
type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: ImageSource }
  | { type: 'tool_use'; id: CallId; name: string; input: unknown }
  | { type: 'tool_result'; callId: CallId; content: string; isError?: boolean }
  // …
```

为什么？因为**模型的一次回复经常是混合体**。比如模型回答：

> 我先看看目录结构。
> [调用工具：list_files]

这段回复里，文字和"发起工具调用"是两个不同性质的块，各自带各自的元数据（工具调用有 id、有参数）。如果压成一个字符串，这些结构信息就丢了。

**判别联合（discriminated union）**是 TypeScript 处理这种"多形态数据"的标准武器：每个变体带一个 `type` 字段做标签，使用方用 `switch (block.type)` 就能安全地分支处理——编译器会强制你处理每一种情况，漏一种都报错。

## StreamChunk：把回复切成小水流

模型生成回复是**一个 token 一个 token 冒出来的**（回忆第 02 讲的 `assistant/chunk` 事件）。llm 包用 `StreamChunk` 类型描述这些碎片：

```ts
type StreamChunk =
  | { type: 'text'; delta: string }        // 一小段文字
  | { type: 'tool_call_start'; … }         // 开始调用某工具
  | { type: 'tool_call_delta'; … }         // 工具参数的增量片段
  | { type: 'finish'; reason: FinishReason } // 结束（正常/被中断/长度上限…）
```

为什么重要？两个原因：

1. **体验**：用户想看到字往外蹦，而不是等 30 秒后一整段砸出来。UI 订阅 chunk 流实时渲染；
2. **控制**：`finish.reason` 告诉循环"这步为什么停了"——正常结束？模型主动要调工具？还是被用户打断了？agent-loop 据此决定下一步。

## 三者如何串起来

一次典型的工具回合，数据流是这样的：

```
UserMessage("看看目录")
  → AssistantMessage( text:"我先看看目录", tool_use:{ name:"list_files" } )
    → ToolResultMessage( tool_result:{ callId, content:"a.txt b.txt" } )
      → AssistantMessage( text:"目录里有 a.txt 和 b.txt…" )
```

每一条都进了第 02 讲讲的 session 日志。**词汇表（本讲）+ 日志（第 12 讲）**，就是智能体对话世界的全部名词。

## 试一试

打开 `packages/llm/llm/src/content.ts`，数一数 ContentBlock 一共有几种变体？对照本讲的表格，找出两个本讲没提到的变体，猜猜它们是干嘛的（提示：和"思考"有关）。

## 下一讲预告

词汇就位，下一讲进入全仓库最重要的一份类型定义：`core/session/src/types.ts`，441 行，十二种事件。读懂它，你就拿到了 dsh 的"世界宪法"。
