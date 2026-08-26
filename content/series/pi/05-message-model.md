---
title: 第05讲·Message 与 Model 类型体系
summary: 拆解 pi-ai 的消息三元组与 Model 接口，看清一次对话在类型层如何被供应商无关地归一。
objectives:
  - 区分 UserMessage / AssistantMessage / ToolResultMessage 三种角色及其字段职责
  - 说明 ToolCall 与 ToolResultMessage 如何配对，构成工具调用的自我闭环
  - 解释 Model 接口承载的元数据为何与消息体解耦
keyPoints:
  - Message 是三元联合（UserMessage | AssistantMessage | ToolResultMessage），定义于 types.ts:455
  - AssistantMessage 以 content 数组统一承载文本、思考与工具调用，types.ts:415
  - ToolCall 用 id+name+arguments 精确描述一次工具请求，types.ts:360
  - ToolResultMessage 用 toolCallId 回指 ToolCall，形成工具闭环，types.ts:437
  - Model 接口聚合 provider/api/cost/contextWindow 等元数据，消息本身不携带这些，types.ts:794
  - ai 仅以 type-only 方式依赖 telemetry（types.ts:1），编译期即解耦
tags: [pi, pi-ai, 类型系统]
---

把一次对话想象成两个人用纸条传话：你写的便签、对方回的便签、以及中间"去查了下字典"的便签，长相各不相同，但都被装进同一个信封里传递。pi 在 `pi-ai` 这一层做的第一件事，就是给这三种"便签"定下统一的形状——这就是本讲的主角：`Message` 与 `Model`。

第 02 讲我们顺着生命线走完了一轮 `runLoop`：模型流式吐字、工具被派发、结果回灌。那一轮里反复出现的 `AssistantMessage`、`ToolCall`，其实就是本讲要拆的类型。先记住一句话：**pi-ai 用一套"供应商无关的消息词汇表"描述对话，所有供应商的差异都被吸收到 `Model` 元数据里，而不是渗进消息体。**

## 一、结论：Message 是三种角色的并集，靠 `role` 区分

`pi-ai` 不把"消息"当成一团自由字符串，而是先把它钉死成三种**角色（role）**：

- `user` —— 用户说的话（`UserMessage`）
- `assistant` —— 模型生成的回复（`AssistantMessage`）
- `toolResult` —— 工具跑完后的结果（`ToolResultMessage`）

三者合并为 `Message` 联合类型，定义在 `packages/ai/src/types.ts:455`：

```ts
export type Message = UserMessage | AssistantMessage | ToolResultMessage;
```

这个联合是**判别联合（discriminated union）**——靠 `role` 字段区分谁是 who。看 `UserMessage`（`types.ts:409`）和 `ToolResultMessage`（`types.ts:437`）的头部就能印证：

```ts
export interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];   // 文本，或文本+图片块
  timestamp: number;                                   // Unix 毫秒
}

export interface ToolResultMessage<TDetails = any> {
  role: "toolResult";
  toolCallId: string;                                  // 回指哪一次 ToolCall
  toolName: string;
  content: (TextContent | ImageContent)[];             // 工具输出（可含图片）
  isError: boolean;                                    // 工具是否失败
  timestamp: number;
}
```

逐行看这几行：

- `role: "user"` 与 `role: "toolResult"` 是字面量类型，TypeScript 据此把 `Message` 拆开——你写 `if (m.role === "toolResult")` 之后，`m.toolCallId` 立刻可用，编译器帮你收窄类型。
- `UserMessage.content` 允许纯字符串，也允许"文本块 + 图片块"数组，因为多模态输入是常态。
- `ToolResultMessage.toolCallId` 是关键：它不是独立消息，而是**对上一次 `ToolCall` 的应答**。第 02 讲内层 `while` 把工具结果回灌进循环，靠的就是这个 `id` 配对。

为什么要这么严格地分角色？因为 `runLoop` 在第 02 讲里对三类消息的处理逻辑完全不同：用户消息是输入、助手消息要被继续生成、工具结果要被模型"消化"成下一步。如果消息类型糊成一团，循环里的分支就会充满 `any` 和运行时判断，既易错又难维护。

## 二、AssistantMessage：一个 `content` 数组扛下所有"助手产出"

最核心的是 `AssistantMessage`（`types.ts:415`）。它描述的是"模型这一次到底产出了什么"——而模型产出可能是文本、是内心思考、是工具调用，三种形态同时存在：

```ts
export interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];  // 文本 / 思考 / 工具调用 混排
  api: Api;                                                // 来自哪个 API（如 "anthropic-messages"）
  provider: ProviderId;                                    // 来自哪个供应商
  model: string;                                           // 具体模型 id
  usage: Usage;                                            // token 用量与花费
  stopReason: StopReason;                                  // 为什么停（stop/toolUse/length/error…）
  timestamp: number;
}
```

逐行拆解：

- `content` 是一个**有序数组**，元素可以是 `TextContent`（文本块）、`ThinkingContent`（思考块，例如 Claude 的 extended thinking）、`ToolCall`（工具调用）。模型回复天然是"先想、再写、中间插一个工具调用"这种交错结构，数组保序正好表达它。
- `api` / `provider` / `model` 三个字段是**溯源信息（provenance）**：这条消息是谁说的、走的是哪套 API。它们跟着消息走，是因为流式渲染、计费、调试都需要知道"这段字是哪个模型吐的"。
- `usage`（`types.ts:370`）记录了 input/output/cacheRead/cacheWrite 的 token 数与 `cost`，这是 `pi-ai` 在消息层就顺手算好的账单——第 08 讲我们会看到这笔账的钱从 `Model.cost` 里来。
- `stopReason` 是循环的"红绿灯"：第 02 讲内层 `while` 就是看它是否是 `toolUse` 来决定要不要继续派发工具。

注意一个精妙之处：`AssistantMessage` 同时出现在"完整消息"和"流式事件"两个语境里。第 06 讲你会看到，流式过程中每个 `AssistantMessageEvent` 都带一个 `partial: AssistantMessage` 的快照——也就是说，`AssistantMessage` 既是最终结果，也是增量更新的载体。

## 三、ToolCall 与 ToolResultMessage：工具闭环的两个半场

工具调用是 agent 的灵魂。它拆成"请求"和"结果"两部分，各自有类型。先看作请求侧的 `ToolCall`（`types.ts:360`）：

```ts
export interface ToolCall {
  type: "toolCall";
  id: string;                       // 全局唯一，用于事后配对
  name: string;                     // 工具名，如 "read_file"
  arguments: Record<string, any>;   // 工具入参
  thoughtSignature?: string;        // 供应商特定的"思考复用"签名（Google 系）
}
```

逐行：

- `id` 是配对主键。模型可能一次要求调用多个工具，每个都有独立 `id`，`ToolResultMessage.toolCallId` 必须精确指回其中一个。
- `name` + `arguments` 是"调哪个、传什么"。注意 `arguments` 是 `Record<string, any>` 而非强类型——因为工具由扩展在运行时注册，`pi-ai` 这一层不知道具体 schema，把它留给上层（`Context.tools`，`types.ts:512`）约束。
- `thoughtSignature` 这种可选字段，正是"供应商差异被吸收进消息"的体现：绝大多数供应商没有它，只有 Google 系用它来跨轮复用思考上下文。

这和 `ToolResultMessage`（`types.ts:437`）一起，构成第 02 讲生命线里那个"自我燃料"闭环：

```
模型吐 ToolCall(id="t1")  →  runLoop 执行工具  →  生成 ToolResultMessage(toolCallId="t1")
        ↑                                                              │
        └────────────── 回灌内层 while，作为新输入 ──────────────────┘
```

`toolCallId` 就是这条回路上的"回程票"。没有它，模型就分不清哪份结果对应哪次调用——尤其在并行调用多个工具时（第 02 讲 `agent-loop.ts:489` 的并发分支）。

## 四、Model：把"模型是谁"从消息里彻底抽走

消息只管"说了什么"，而"说话者是谁、能力几何、花多少钱"被统一收进 `Model` 接口（`types.ts:794`）：

```ts
export interface Model<TApi extends Api> {
  id: string;                      // 模型标识，如 "claude-opus-4-7"
  name: string;                    // 展示名
  api: TApi;                       // 使用的 API 方言
  provider: ProviderId;            // 所属供应商
  baseUrl: string;                 // 接入点
  reasoning: boolean;              // 是否支持推理/思考
  thinkingLevelMap?: ThinkingLevelMap;  // pi 思考档位 → 供应商档位的映射
  input: ("text" | "image")[];     // 支持的输入模态
  cost: ModelCost;                 // 单价（$/百万 token）
  contextWindow: number;           // 上下文窗口
  maxTokens: number;               // 单次最大输出
  samplingParams?: Record<string, unknown>;  // 该模型默认采样参数
}
```

逐行：

- `Model` 是**泛型** `Model<TApi>`，`TApi` 约束它走哪套 API 方言。这样 `anthropicProvider()` 返回的就是 `Model<"anthropic-messages">`，类型层面就保证不会拿错 API。
- `cost` / `contextWindow` / `maxTokens` 是"账单与容量"的真相来源——第 02 讲 `AssistantMessage.usage.cost` 正是按这里的单价算出来的。
- `thinkingLevelMap` 体现了抽象的价值：pi 内部用一套统一的思考档位（`minimal`/`low`/`medium`/`high`…），再映射到各家供应商自己的档位名。消息层完全不用关心这些差异。
- `samplingParams` 是"该模型出厂默认采样参数"，请求时可以被单次覆盖（`types.ts:811` 注释明确说 per-request keys 覆盖它）。

**关键设计取舍**：为什么 `Model` 不塞进 `Message`？因为一条消息可能被多个模型接力处理、或在不同会话里复用，而"模型元数据"是稳定且昂贵的（要查价目表、上下文窗口）。把它抽成独立对象，消息就保持轻量、`pi-ai` 的流式与序列化都更便宜，也方便第 07 讲 `ModelsImpl` 用一个 `Map` 集中管理所有 `Model`。

> **知识拓展：ai 对 telemetry 只做"类型层"依赖**
> `types.ts:1` 是 `import type { TelemetryContext } from "@earendil-works/pi-telemetry"`——注意 `import type`。这意味着 `pi-ai` 在**运行时完全不依赖** `pi-telemetry`，只在编译期为 `Model.stream` 等签名引用 `TelemetryContext` 类型。这种"只借类型、不绑实现"的写法，正是第 11 讲遥测能随时被换成 NOOP / InMemory 而不污染 `pi-ai` 的前提。

## 试一试

打开 `packages/ai/src/types.ts`，定位到 `Message` 联合（`:455`）。回答三个小问题：

1. `AssistantMessage.content` 的元素类型包含 `ToolCall`（`types.ts:415`）。这说明模型的一次回复里，文本和工具调用是什么关系——互斥还是可共存？结合第 02 讲内层 `while` 的退出条件想一想。
2. 找到 `ToolResultMessage.toolCallId`（`:437`）和 `ToolCall.id`（`:360`）。如果一次回复并行触发了两个工具，循环靠什么保证"结果不错配"？
3. 看 `Model` 接口的 `cost` 字段（`:794` 附近）。为什么把价格放在 `Model` 而不是 `AssistantMessage` 里？试着用"消息可能被复用"这个理由解释。

## 下一讲预告

消息和模型这两套"词汇表"已经就位，但还有一个悬而未决的问题：模型不是一次性把整段回复端上来的，它是一字一句"流"出来的，而且每家供应商的流式格式都不一样。下一讲我们进 `AssistantMessageEvent` 与 `EventStream`，看 pi 如何把五花八门的 SSE 归一成同一种事件流——这也是第 02 讲 TUI"边想边显示"的底层机制。
