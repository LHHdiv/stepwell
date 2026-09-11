---
title: "03 · types.ts — 主链合同：消息、工具、事件、streamFn"
summary: "把主链的四个合同画清楚：StreamFn 怎么失败、AgentMessage 怎么扩展、AgentTool.execute 和 loop 钩子怎么配合、AgentEvent 的顺序。01、02 已经在用这些类型；本课把形状钉死，后面读 "
tags: [pi, agent]
---
源码：`packages/agent/src/types.ts`  
被谁调用：`agent.ts`、`agent-loop.ts`、coding-agent 的 `sdk.ts` / `agent-session.ts`、以及 harness 侧大量 `import type`。

## 本课目标

把主链的四个合同画清楚：`StreamFn` 怎么失败、`AgentMessage` 怎么扩展、`AgentTool.execute` 和 loop 钩子怎么配合、`AgentEvent` 的顺序。01、02 已经在用这些类型；本课把形状钉死，后面读 harness 时才分得清「同一套消息」和「另一套操作状态」。

## 在系统中的位置

```text
coding-agent sdk
  setDefaultStreamFn(streamSimple)     【满足 StreamFn】
  new Agent({ tools: AgentTool[] })
       AgentState.messages: AgentMessage[]
       subscribe(AgentEvent)
       beforeToolCall / afterToolCall
```

harness 的 `AgentHarnessTool` 是把 `execute` 换成带 `toolContext` / `invocation` / `Context` 的版本，其它字段（`label`、`replay`、`executionMode`）仍来自这里。

## `StreamFn`

```ts
(model, context, options?) => AssistantMessageEventStream | Promise<...>
```

注释写了三条硬合同，loop 依赖它们：

1. 请求失败、模型不可用、运行时错误 **不得 throw / 不得返回 rejected Promise**。
2. 必须返回 `AssistantMessageEventStream`。
3. 失败编进流：协议事件 + 最终 `AssistantMessage`，`stopReason` 为 `"error"` 或 `"aborted"`，带 `errorMessage`。

coding-agent 注入的是 `packages/ai` 的 `streamSimple`。本包自己的默认值在下一课 `stream-fn.ts`，没配置就 throw。`proxy.ts` 的 `streamProxy` 也满足这个形状。

## `ToolExecutionMode` 与 `QueueMode`

- `"sequential"`：同一条助手消息里的工具，一件做完再下一件。
- `"parallel"`：校验/拦截顺序做，真正的 `execute` 并发；`tool_execution_end` 按完成序，写进 transcript 的 toolResult 按助手消息里的原始顺序。

`QueueMode`：`"all"` 一次倒空 steer/followUp；`"one-at-a-time"` 每次只放最老的一条。coding-agent 从设置读，Agent 构造时写入。harness 的 lane inbox 用同一对字符串。

## 工具钩子

`BeforeToolCallResult.block === true` 时不调用 `execute`，loop 发一条错误 toolResult。`terminate` 只是提示：必须 **本批每一个** finalized 结果都 terminate，loop 才不再问模型——02 课已讲过混合批次。

`AfterToolCallResult` 是字段级覆盖，没有深合并：给了 `content` 就整数组替换。`usage` 是工具自己的用量，不计入主 LLM context。

`ShouldStopAfterTurnContext.newMessages`：这次 `prompt` 新增的消息。continuation（`continue()`）不含进循环前已有的 context。压缩「必须先摘要再继续」挂在 `shouldStopAfterTurn`。

`AgentLoopTurnUpdate` 是 `prepareNextTurn` 的返回值：可换 context / model / thinkingLevel。coding-agent 的压缩常在这里改消息列表。

四个回调的合同都是：**不得 throw**。throw 会打断 loop，事件序列不完整。

## `AgentMessage` 与 declaration merging

```ts
export type AgentMessage = Message | CustomAgentMessages[keyof CustomAgentMessages];
```

`CustomAgentMessages` 默认空。宿主用 `declare module` 往里加角色。harness 的 `messages.ts` 就是这样加上 `bashExecution` / `custom` / `branchSummary` / `compactionSummary` 的。主链 `convertToLlm` 默认丢掉它不认识的角色。

`ThinkingLevel` 含 `"xhigh"` / `"max"`，只有部分模型族支持。是否支持看 `@earendil-works/pi-ai` 的模型元数据，Agent 不校验。

## `AgentState` / `AgentTool`

`tools` 和 `messages` 是 accessor：赋值时拷贝顶层数组。这是 01 课「不要和外部数组共享引用」的类型层表达。`isStreaming` 一直持续到 `agent_end` 的订阅者都 settle。

`AgentTool.execute`：**失败要 throw**，不要把错误写进 `content`。loop 的 wrapper 会收成 isError 结果。这和 `StreamFn` 相反——模型调用不能 throw，工具调用可以。`onUpdate` 只在这次 `execute` 的 Promise settle 之前有效。

`replay?: "never" | "safe"` 是给 harness 崩溃恢复用的。主链 `agent-loop` **不读这个字段**。读工具、查询标 `"safe"`；删文件、写盘标 `"never"`（或不写，恢复时当 never）。

## `AgentEvent`

生命周期顺序：

```text
agent_start
  turn_start
    message_start / message_update* / message_end     【用户句、助手流、toolResult】
    tool_execution_start / update* / end
  turn_end
agent_end
```

`message_update` 只在助手流式时出现，并带上原始 `AssistantMessageEvent`。`agent_end` 是最后一个事件，但订阅者的 Promise 仍算在一轮结算里。

## 失败与边界

| 合同 | 违约后果 |
|---|---|
| StreamFn throw | 穿到 Agent lifecycle，不是一条带 error 的助手消息 |
| convertToLlm / transformContext throw | loop 中断，没有正常 `agent_end` 序列 |
| 工具 execute throw | 若 wrapper 没接住，炸整轮 |
| 给 CustomAgentMessages 加角色却不改 convertToLlm | 模型看不到这些消息 |

## 下一课

[04-stream-fn.ts.md](/series/pi-source/agent/245-stream-fn-ts/)：默认 streamFn 从哪来。类型读完再回头看 02 的 `streamAssistantResponse`，合同会对上。
