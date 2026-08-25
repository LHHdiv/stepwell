---
title: 第12讲·Session 日志：441 行的"世界宪法"
summary: 逐段精读 core/session/src/types.ts：十二种事件如何定义了智能体世界的全部"发生过的历史"。
objectives:
  - 读懂 SessionEventMap 判别联合的全部事件类型
  - 理解"append-only 日志 = 唯一事实来源"的架构含义
  - 理解 deriveMessages：模型视野是从日志推导出来的
tags: [deepseek-harness, session, 事件溯源]
keyPoints:
  - SessionEventMap 用声明合并开放扩展——插件可以往历史里加新事件
  - 日志只追加不修改，任何"改历史"都是追加一条新事件
  - 模型看到的消息列表由 deriveMessages() 从日志推导，不单独存储
---

这是全系列最重要的一讲。打开 `packages/core/session/src/types.ts`，441 行，没有一行逻辑——全是类型定义。但 dsh 的整个世界观都写在里面。我们慢慢读。

## 先建立直觉：日志是一本"流水账"

回忆第 02 讲的医院病历类比。session 包维护的就是一本**只许写、不许改**的流水账：

```
[001] user/message      "帮我看看这个报错"
[002] turn/start        { turn: 1 }
[003] step/start        { turn: 1, step: 1 }
[004] assistant/chunk   "好的，我先…"
[005] assistant/message （完整回复+工具调用）
[006] tool/call         list_files
[007] tool/result       "a.txt b.txt"
[008] step/end
[009] assistant/message （最终回答）
[010] turn/end
```

每一行是一个**事件（SessionEvent）**。整个 dsh 里，"发生过什么"的唯一权威记录就是这本账。UI 显示什么、模型看到什么、查询历史——全部从账本推导。

## SessionEventMap：十二种事件

types.ts 的核心是一个接口，形如（简化）：

```ts
export interface SessionEventMap {
  'turn/start':        { turn: number };
  'step/start':        { turn: number; step: number };
  'user/message':      { message: UserMessage };
  'assistant/chunk':   { turn: number; step: number; chunk: StreamChunk };
  'assistant/message': { turn: number; step: number; message: AssistantMessage };
  'tool/call':         { callId: CallId; name: string; arguments: string };
  'tool/result':       { message: ToolResultMessage };
  'step/end':          { turn: number; step: number };
  'turn/end':          { turn: number };
  // …
}
```

读法：**键是事件名，值是这个事件携带的数据形状**。比如 `tool/call` 事件必须带 callId、工具名、参数字符串。配合第 10 讲的 Branded ID，callId 想传错都传不进去。

## 一个精巧设计：声明合并

注意这个接口是 `interface` 而不是 `type`——这不是随手写的。TypeScript 里 interface 支持**声明合并**：任何插件都可以再写一个同名接口给自己的事件加条目：

```ts
// 某个插件这样扩展事件表：
declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    'my-plugin/timer': { at: number };
  }
}
```

于是事件系统对插件**开放扩展、关闭修改**——核心代码一行不用动，新事件就能进入日志。这正是第 03 讲"一切皆插件"在数据层的落地。全仓库还有一个配套模式：`…Map → keyof` 派生联合，即用 `keyof SessionEventMap` 自动得到"所有合法事件名"的联合类型，加一个事件，所有 switch/监听器自动感知。

## 最高不变量：模型可见 = 已入日志

types.ts 里还有一组关键函数签名，最重要的是 `deriveMessages()`（实现在同包其他文件，签名在 types 里声明）：

```ts
function deriveMessages(events: SessionEvent[]): AssistantMessage[] | …
```

它的语义：**给定日志，推导出"模型应该看到的消息列表"**。注意方向——不是"维护一个消息列表，顺手记日志"，而是**只有日志，消息列表是推导结果**。这一字之差，天壤之别：

- 单一事实来源：不存在"日志和消息列表不一致"这种 bug 类别；
- 天然可回放：任何时刻从日志重放，就能重建完整状态（测试、迁移、调试都靠它）；
- 审计友好：谁在什么时候说了什么、调了什么，账本上全有。

## 为什么这 441 行值得逐行读

因为它是"宪法"：其他所有包的代码，都是在实现或消费这份类型定义。后面读 agent-loop（第 21 讲起）时你会发现，那个 516 行的驱动器，本质上就是**一个让日志按预期增长的循环**。

## 试一试

在 types.ts 里找到 `SessionEventMap`，把十二种事件名抄下来，按"回合内出现顺序"排成一列。对照第 02 讲的生命线图，标出每个事件发生在流程的哪一站。做完这个练习，你对 dsh 的理解已经超过大多数只跑过 demo 的人。

## 下一讲预告

日志是名词，接下来该看动词了。卷三我们进入产品的心脏：`core/agent` 的 Agent 接口——智能体对外的"操作面板"，以及那个著名的 inbox（收件箱）。
