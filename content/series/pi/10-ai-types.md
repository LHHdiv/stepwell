---
title: 第10讲·types.ts：pi-ai 的类型宇宙
summary: 精读 pi-ai 的 831 行 types.ts：Api、Model、Message、Usage、StopReason——一切类型的源头。
objectives:
  - 读懂 KnownApi 枚举与"协议适配器"的对应关系
  - 掌握统一消息格式与 StopReason 的全部取值
  - 理解 Model<TApi> 元数据里每个字段的用途
tags: [pi, pi-ai, 类型系统]
keyPoints:
  - KnownApi 枚举列出 10 种 API 协议，每种对应 src/api/ 下的一个适配器
  - AssistantMessage 自带 api/provider/model/usage/stopReason——消息自带"出身证明"
  - StopReason 七种取值，驱动上层循环的分支决策
---

卷二：pi-ai。这是 pi 的地基包——**与任何一家供应商无关**的统一 LLM 抽象。第一站是它的类型宇宙：`packages/ai/src/types.ts`，831 行。dsh 用 SessionEventMap 当"宪法"，pi 的对应物就是这份文件。

## KnownApi：协议的枚举

types.ts 第 17-28 行：

```ts
export type KnownApi =
  | "openai-completions"
  | "openai-responses"
  | "anthropic-messages"
  | "google-generative-ai"
  | "google-vertex"
  | "bedrock-converse-stream"
  | "mistral-conversations"
  // …
```

这个枚举是理解 pi-ai 的钥匙。**供应商（provider）和协议（api）是两个维度**：DeepSeek 和很多国产厂商说的是 "openai-completions" 协议，Anthropic 说的是 "anthropic-messages" 协议。pi 的适配器按**协议**划分（`src/api/openai-completions.ts` 等 10 个文件），供应商按**品牌**划分（`src/providers/deepseek.ts` 等 35+ 个）——一个协议适配器服务 N 个供应商。这比"每家供应商写一套适配器"少了大量重复代码。

## 消息类型：自带"出身证明"

统一消息格式（第 409-455 行）：

```ts
export interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
}

export interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: Api;              // 用哪个协议
  provider: ProviderId;  // 哪家供应商
  model: string;         // 哪个模型
  usage: Usage;          // token 用量
  stopReason: StopReason; // 为什么停
  errorMessage?: string;
  timestamp: number;
}
```

对比 dsh 的 AssistantMessage：pi 的版本**把元数据直接焊在消息上**。每条 AI 消息都记得自己是"谁家的哪个模型、花了多少 token、为什么停"。这个设计让多供应商混用时（比如主对话用 A 家、子任务用 B 家）的审计和成本统计变得 trivial。

注意 content 里的 `ThinkingContent`——推理模型的思考过程也是一等公民内容块，和 dsh 的设计呼应。

## StopReason：循环的路标

第 393 行，七种取值：

```ts
export type StopReason = "pending" | "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred";
```

上层循环（卷三的 agentLoop）看到 `toolUse` 就去执行工具然后继续，看到 `length` 就知道撞上下文上限了，`aborted` 表示被用户打断。**一个枚举值，一个分支**——循环的所有决策路径都由它驱动。对照 dsh 第 11 讲的 StreamChunk finish 事件，同一个问题的两种解法：dsh 用事件，pi 用字段。

## Model<TApi>：模型的身份证

第 794 行的 `Model<TApi>` 接口描述一个模型的全部元数据：`id/api/provider/baseUrl`（连谁、走什么协议）、`contextWindow/maxTokens`（容量）、`cost`（价格表）、`reasoning/thinkingLevelMap`（推理能力）。**这些数据不写死在代码里，而是每个供应商配一份 JSON 目录**（`src/providers/data/deepseek.json`）——升级模型列表 = 更新数据文件。

## 试一试

打开 types.ts，找到 `Usage` 接口。它除了 input/output tokens 还统计什么？（提示：找 cache 和推理相关的字段。）这些字段为什么对"成本敏感"的个人智能体特别重要？

## 下一讲预告
类型是静态的，流是动态的。下一讲读 pi-ai 的流式基石：EventStream——一个不依赖任何 SSE 库的自研事件流。
