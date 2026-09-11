---
title: "02 · agent-loop.ts — 问模型、跑工具、再问"
summary: "把两层 while 画在纸上。能指出：用户消息在哪入列、streamFn 在哪调用、toolCall 如何变成 toolResult、什么条件结束整次 Agent。这是整个仓库最值得单步的文件。"
tags: [pi, agent]
---
源码：`packages/agent/src/agent-loop.ts`  
被谁调用：`Agent.runPromptMessages` → `runAgentLoop`；重试走 `runAgentLoopContinue`。

## 本课目标

把两层 `while` 画在纸上。能指出：用户消息在哪入列、`streamFn` 在哪调用、toolCall 如何变成 toolResult、什么条件结束整次 Agent。这是整个仓库最值得单步的文件。

## 在系统中的位置

```text
runAgentLoop(prompts, context, config, signal, streamFn)
  emit agent_start, turn_start
  把 prompts 作为 message_start/end 发出（用户那一句）
  runLoop(...)
    内层：streamAssistantResponse → 或许 executeToolCalls → turn_end
    外层：followUp 队列还有货就再来
  emit agent_end
```

`runAgentLoopContinue` 不把新 prompt 加进列表，从当前 context 接着内层循环。最后一条必须能被 `convertToLlm` 变成 user 或 toolResult，否则厂家 API 会拒。

## `runLoop` 两层 while（约 156 行）

先读骨架，再填函数名。

```text
while (true) {                          // 外层：followUp
  while (还有工具 或 有 steer 插话) {   // 内层
      若刚结束过一轮：prepareNextTurn（压缩常在这里）
      把 pending 的用户插话写入 context
      message = streamAssistantResponse(...)   // 调模型
      若 error/aborted：agent_end; return
      若有 toolCall：executeToolCalls，结果推进 context
      turn_end
      若 shouldStopAfterTurn：agent_end; return
      再拉 steer 队列
  }
  拉 followUp；有则 continue 外层，无则 break
}
agent_end
```

### 为什么是两层

工具调用必须在同一「Agent 还没结束」的语境里立刻再问模型，否则模型看不到 toolResult。这是内层。

用户说「做完再总结」属于 followUp：工具链正常结束、本会 `agent_end` 时，外层发现还有话，再开一轮，事件上会再看到 `turn_start`。

steer 插在内层顶部：当前助手回合已经 `turn_end`，下一趟 `streamAssistantResponse` 之前注入，模型能看到你的插话和刚完成的工具。

### `prepareNextTurn`

coding-agent 把压缩挂在这里。压缩可能很慢，所以函数在 prepare 之后**再拉一次** steer：用户在压缩期间打的字不要丢。注释写了 one-at-a-time 时不要拉两次，否则一次放出两句。

### `shouldStopAfterTurn`

压缩「必须先摘要再继续」时返回 true：结束这一次 `prompt` 的 loop，外层的 AgentSession 再决定是否自动 `continue()`。Loop 不管压缩策略，只提供这个钩子。

## `streamAssistantResponse`（约 279 行）

这是「AgentMessage 世界」和「LLM Message 世界」的边界。

1. `transformContext(messages)` — 扩展可改列表（仍是 AgentMessage）
2. `convertToLlm` — 滤 custom、必要时挡图片，得到厂家认识的 Message[]
3. 组装 `Context { systemPrompt, messages, tools }`
4. `getApiKey(provider)` — OAuth 可能刚刷新
5. `streamFn(model, context, { apiKey, signal, ...config })` — **进入 packages/ai**
6. `for await (const event of response)`：
   - `start`：把 partial assistant 推进 context.messages，emit `message_start`
   - `text_delta` / `thinking_delta` / `toolcall_*`：更新那条消息，emit `message_update`
   - 结束：emit `message_end`，返回完整 AssistantMessage

若在循环中被 abort，stopReason 为 `aborted`。若厂家报错，通常仍返回一条带 `error` 的助手消息，而不是 throw。throw 会穿到 Agent 的 lifecycle。

**工具参数是流式拼出来的 JSON。** 模型说 `read` 时，`path` 字段可能分多个 delta 到达。完整参数在 `message_end` 之后才可信。`stopReason === "length"` 时参数可能被截断，见下。

## `executeToolCalls`（约 409 行）

先取出助手消息里所有 `type: "toolCall"`。

若全局 `toolExecution === "sequential"`，或这批里**任意一个**工具的 `executionMode === "sequential"`，整批顺序执行。否则并行。

`runLoop` 在调用前还有一道：`stopReason === "length"` 则 **全部工具改走失败结果**（`failToolCallsFromTruncatedMessage`），不执行。截断的 JSON 可能是半个路径，跑起来会乱删文件。这是安全阀，不是性能优化。

### 顺序批 `executeToolCallsSequential`

对每个 toolCall：

1. emit `tool_execution_start`
2. `prepareToolCall`：按名字找 tool、校验参数 schema。找不到或校验失败 → `kind: "immediate"` 的错误结果，不调用 execute
3. `beforeToolCall` 钩子（AgentSession 用来让扩展拦截）。钩子可 `block` 并 `terminate`
4. `tool.execute(args)` — **真正的副作用**（读盘、写盘、shell）
5. `afterToolCall` 钩子可改写结果
6. emit `tool_execution_end`，再把 `toolResult` 消息 emit 出去

顺序批里下一件工具能看到上一件已经完成。bash 接 write 时这很重要。

### 并行批 `executeToolCallsParallel`

先顺序做完所有 prepare/before（校验、拦截不能并行乱序），再把允许执行的 `execute` 并发起来。`tool_execution_end` 按完成顺序发出，但写进 context 的 toolResult **仍按助手消息里的原始顺序**。模型下一轮看到的顺序和它发出的 call 顺序一致，和谁先跑完无关。

### `terminate`

某次结果带 `terminate: true`（工具自己要求停，或 beforeToolCall 拦截）。**整批每一个** finalized 都 terminate，loop 才不再调模型。混合批次继续问模型——否则「一个工具说停、另一个刚写完文件」会让模型看不到写文件的结果。

## 失败与边界

| 情况 | 行为 |
|---|---|
| stream 出错 | 助手消息 stopReason=error，loop 结束 |
| abort | stopReason=aborted，跑着的工具靠 signal 停 |
| 未知工具名 | 错误 toolResult，继续让模型看到「没有这个工具」 |
| 参数校验失败 | 同上，模型可改参数重试 |
| length 截断 | 本批工具全部失败结果，不执行 |

工具实现内部的异常应被 execute 包成 isError 结果。若 throw 穿出，会炸整轮——coding-agent 的 tool wrapper 负责兜住。

## 下一课

`streamFn` 的实现在 `packages/ai`。工具的 `execute` 在 `packages/coding-agent/src/core/tools/`。建议先读 **read.ts**（副作用最小），再读 bash.ts。ai 包的模块导读：[../ai/](../ai/) 将从 `streamSimple` 开始写。
