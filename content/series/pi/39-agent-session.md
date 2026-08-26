---
title: 第39讲·AgentSession：把内核包成会话
summary: 底层的 Agent 类只会"跑循环"，AgentSession 才是用户侧能驱动的对象——它把工具、扩展、持久化、模式都包了进来。本讲看这层包装。
objectives:
  - 说出 AgentSession 相比第 12 讲 Agent 类，多包了哪些东西
  - 指出 prompt() 是上层驱动 agent 的统一入口（agent-session.ts:1116）
  - 把 AgentSession 与第 18 讲 harness、第 24 讲 SessionManager 连起来
tags: [pi, AgentSession, 会话, 产品装配]
keyPoints:
  - "AgentSession（agent-session.ts:305）是用户侧入口，内部持有底层 Agent（第 12 讲）+ 工具注册表 + 扩展 + 持久化"
  - "prompt(text, options?)（:1116）是上层驱动 agent 的统一方法：交互/打印/rpc 三种模式都调它"
  - "会话配置含 customTools（:208/:383）、active tools 由 setActiveToolsByName（:928）按名启用并重建系统提示"
  - "AgentSession 之上才是第 23 讲的三种模式与第 24 讲的 SessionManager——它是'可运行的内核包装'"
  - "getAllTools（:908）暴露工具清单（带 sourceInfo），让 UI/调试能看见'当前有哪些能力'"
---

第 12 讲我们认识了底层 `Agent` 类——它知道怎么跑 `runLoop`、怎么管 `MutableAgentState`。但 `Agent` 太"裸"：没有工具清单、没有扩展、没有持久化、不知道自己被哪种模式驱动。这一讲的主角 `AgentSession`，就是给这个裸内核套上的"产品外壳"。

## 一、先结论：AgentSession = Agent + 一切周边

`packages/coding-agent/src/core/agent-session.ts:305`：

```ts
export class AgentSession {
	// 持有 this.agent（底层 Agent，第 12 讲）
	// 持有工具注册表、扩展集合、会话配置、持久化句柄
}
```

它的职责是**把分散的零件聚成一个"能直接被驱动"的对象**。对比一下：

| 维度 | `Agent`（第 12 讲） | `AgentSession`（本讲） |
|---|---|---|
| 跑循环 | ✅ runLoop / runWithLifecycle | 委托给内部 agent |
| 工具 | 只知道 `state.tools` 列表 | 维护完整注册表 + 来源标记 |
| 扩展 | 不感知 | 装载并驱动扩展生命周期 |
| 持久化 | 不感知 | 接 SessionRepo（第 34 讲） |
| 驱动方式 | 内部方法 | `prompt()` 统一入口 |

简单说：**`Agent` 会跑，`AgentSession` 能跑、能配、能存、能被各种模式调**。

## 二、prompt()：唯一的驱动入口

上层（三种模式）不需要懂 `runLoop` 细节，它们只调一个方法。看 `agent-session.ts:1116`：

```ts
async prompt(text: string, options?: PromptOptions): Promise<void> {
	// 把 text 变成消息，交给内部 agent 跑一轮
}
```

`PromptOptions`（`agent-session.ts:239`）定义这次"提问"的附加信息（是否流式、用哪个工具集等）。无论第 23 讲哪种模式：

- interactive 的 `while(true) { session.prompt(input) }`；
- print 的 `runPrintMode(session, input)`；
- rpc 的远程调用处理器；

**全都汇聚到 `session.prompt()`**。这就是"内核包装"的价值——把复杂留给自己，给上层一个干净的统一入口。

## 三、工具与配置：会话知道"自己能干什么"

`AgentSession` 还管"本次会话有哪些能力"。回顾：

- `customTools` 配置项（`agent-session.ts:208`），在 `:383` 收进 `this._customTools`；
- `setActiveToolsByName`（`agent-session.ts:928`）按名字启用工具，并**重建系统提示**让模型知道当前工具集；
- `getAllTools`（`agent-session.ts:908`）列出全部工具、带 `sourceInfo`（来自内置/配置/扩展）。

于是 UI 能显示"当前可用工具"、调试能审计"为什么某工具没出现"、模式切换能动态调整能力——这些都不是 `Agent` 该操心的事，归 `AgentSession`。

## 四、和 harness、SessionManager 的关系

`AgentSession` 不是孤立的，它上接模式、下接持久化：

- **向上**：第 23 讲的三种模式持有 `AgentSession`，驱动它；
- **向下**：第 18 讲的 `AgentHarness` 管理"跨进程/跨运行的会话状态"，`AgentSession` 是它在本地进程里的代言人；第 24 讲的 `SessionManager` 负责"列出/加载/分叉会话"，加载出来的就是一个 `AgentSession`。

> **一句话总结**：`Agent`（内核）只会思考；`AgentHarness`（第 18 讲）管运行态上下文；`SessionManager`（第 24 讲）管持久与分叉；`AgentSession`（本讲）把这三者和工具/扩展/模式缝成一个"用户敲一下就能跑"的对象。

## 五、试一试

1. 在 `agent-session.ts:1116` 的 `prompt` 里看它第一步是不是把 `text` 包成 `Message` 再交给 `this.agent.prompt(messages)`（搜 `:1066` 的 `this.agent.prompt`），印证"包装即委托"。
2. 打开 `:239` 的 `PromptOptions`，看它暴露了哪些可调项（流式？工具集？），推断 print 模式可能传哪些不同选项。
3. 思考：如果 `AgentSession` 同时被 interactive 模式和 rpc 模式持有，会不会冲突？从"一个进程一个会话"还是"一个会话多驱动器"的角度分析。

## 下一讲预告

`AgentSession` 已经是完整产品对象，但它"长什么样"仍取决于装了哪些扩展、关了哪些内置工具。下一讲看 pi 的"扩展式可塑性"——同一套内核，怎么变成不同的产品。
