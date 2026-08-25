---
title: 第21讲·Agent 类与状态管理：防御性拷贝的艺术
summary: 精读 agent.ts（593 行）：闭包 getter/setter、AgentState、PendingMessageQueue——无状态库的状态管理范本。
objectives:
  - 理解 createMutableAgentState 的防御性拷贝手法
  - 掌握 AgentState 的字段构成
  - 理解 Agent 与 agentLoop 的分工
tags: [pi, agent, 状态管理]
keyPoints:
  - Agent 类用闭包 getter/setter 包裹状态，setter 一律 slice() 拷贝
  - AgentState 七字段：systemPrompt/model/thinkingLevel/tools/messages/isStreaming/…
  - Agent 持有状态与订阅，agentLoop 是纯函数式的循环——状态与逻辑分离
---

循环（agentLoop）是纯逻辑，那**状态**住在哪里？答案：`packages/agent/src/agent.ts`（593 行）的 `Agent` 类。

## 防御性拷贝：一个小而重要的手法

看 Agent 类的 tools 存取器（原文）：

```ts
get tools() {
  return tools;
},
set tools(nextTools: AgentTool<any>[]) {
  tools = nextTools.slice();
},
```

`slice()` 拷贝了一份再存。为什么？防止外部持有数组引用后原地修改——那会让"状态什么时候变的"变得不可追踪。**setter 强制拷贝，保证每次赋值都是一次明确的替换事件**。没有 Redux、没有 Proxy，几十行闭包就实现了可审计的状态管理。这种"够用就好"的克制，是 pi 哲学的最佳注脚。

## AgentState：状态的完整清单

types.ts 第 330 行：

```ts
interface AgentState {
  systemPrompt: string | SystemPrompt;
  model: Model;
  thinkingLevel: ThinkingLevel;
  tools: AgentTool[];
  messages: AgentMessage[];
  isStreaming: boolean;
  streamingMessage: AgentMessage | undefined;
  pendingToolCalls: ...;
  errorMessage: string | undefined;
}
```

九个字段说尽了一个智能体实例的全部运行状态：**配置**（systemPrompt/model/thinkingLevel/tools）+ **对话**（messages）+ **瞬时**（isStreaming/streamingMessage/pendingToolCalls/errorMessage）。你调试任何智能体问题，本质上就是检查这九个字段的某几个。

## AgentTool：比 dsh 多了什么

types.ts 第 380 行的工具接口（节选）：

```ts
export interface AgentTool<TParameters, TDetails> extends Tool<TParameters> {
  label: string;
  prepareArguments?: (args: unknown) => Static<TParameters>;
  execute: (toolCallId, params, signal?, onUpdate?) => Promise<AgentToolResult<TDetails>>;
  executionMode?: ToolExecutionMode;   // "sequential" | "parallel"
}
```

三个亮点：`signal` 参数让工具能响应取消（第 22 讲的中断传播就靠它）；`onUpdate` 回调支持**长时工具的进度上报**（比如跑测试，边跑边汇报）；`executionMode` 声明工具能否并行执行——多个独立工具调用可以同时跑，这是 dsh 里没有的显式设计。

## Agent 与 loop 的分工

一句话总结：**Agent 持有"是什么"（状态），agentLoop 计算"怎么变"（逻辑）**。loop 每一步从 Agent 读状态、把新消息写回。这种分离让循环可以被完全重放测试（给定初始状态 + 输入序列，断言事件序列）——pi 的集成测试全靠这个性质。

## 试一试

打开 agent.ts，找到 `PendingMessageQueue`（第 124 行起）。读它的 `add` 和取消息方法，回答：QueueMode 的 `one-at-a-time` 模式下，第二条 steering 消息要等到什么时候才会被消费？

## 下一讲预告
卷四：进入产品层 coding-agent。先看它的工具落地（tools/index.ts + read.ts），对照 pi-agent-core 的接口看"真实工具"长什么样。
