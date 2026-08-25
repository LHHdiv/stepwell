---
title: 第20讲·agentLoop：双 while 循环的骨架
summary: 精读 pi-agent-core 的 agent-loop.ts（797 行）：外层 follow-up 队列 + 内层工具循环。
objectives:
  - 读懂 runLoop 的双 while 结构
  - 理解 steering 与 follow-up 两种插队消息的区别
  - 掌握 AgentLoopConfig 的钩子体系
tags: [pi, agent-loop, 核心循环]
keyPoints:
  - agentLoop（新任务）/ agentLoopContinue（重试续跑）/ runLoop（内部实现）
  - 外层 while 消化 follow-up 队列，内层 while 消化工具调用
  - steering 消息在内层每轮开始前注入——与 dsh 的 next-step 机制同构
---

卷三：pi-agent-core。核心文件 `packages/agent/src/agent-loop.ts`，797 行，导出三个函数：

- `agentLoop`（30 行）：新 prompt 启动的入口；
- `agentLoopContinue`（60 行）：重试/续跑的入口；
- `runLoop`（155 行起）：真正的循环实现。

## 双 while 骨架

runLoop 的开头（原文）：

```ts
async function runLoop(
  initialContext: AgentContext,
  newMessages: AgentMessage[],
  initialConfig: AgentLoopConfig,
  signal: AbortSignal | undefined,
  emit: AgentEventSink,
  streamFunction: StreamFn,
): Promise<void> {
  let currentContext = initialContext;
  let config = initialConfig;
  let firstTurn = true;
  let pendingMessages: AgentMessage[] = (await config.getSteeringMessages?.()) || [];
  while (true) {
    let hasMoreToolCalls = true;
    while (hasMoreToolCalls || pendingMessages.length > 0) {
```

剥掉细节，结构就是：

```
while (true) {                          # 外层：回合循环
  while (还有工具调用 || 有插队消息) {     # 内层：步循环
    注入 steering 消息
    请求模型（streamFunction）
    if 模型要求调工具: 执行 → 结果入上下文 → 继续
    else: 跳出内层
  }
  if follow-up 队列有货: 取一条当新输入 → 继续
  else: 结束
}
```

**外层管"用户还想说什么"（follow-up），内层管"模型还想干什么"（工具调用）**。两层循环的分离，让"用户连发三条消息"和"模型连环调五个工具"互不干扰。

## steering：内层循环的插队口

注意 `getSteeringMessages()` 在**内层每轮开始前**被调用——这就是 steering 的落点。你在模型干活途中发的纠正消息，会在它下一步思考前被注入。对照 dsh 第 22 讲的 inbox next-step 机制：**同一个问题，同一个答案位置**。英雄所见略同 ×2。

follow-up 则走外层：当前回合彻底结束后，才从队列取下一条当新输入。两种插队、两个落点、两个队列——`PendingMessageQueue` 类（agent.ts 第 124 行）负责管理它们，支持 `all`（一次全发）和 `one-at-a-time`（逐条消化）两种模式。

## AgentLoopConfig：钩子大礼包

循环的行为由配置对象定制，钩子清单（types.ts 150 行起）值得全览：

| 钩子 | 用途 |
|---|---|
| `convertToLlm` | AgentMessage → LLM 消息的边界转换 |
| `transformContext` | 发请求前最后改一次上下文 |
| `getApiKey` | 按需取凭据 |
| `shouldStopAfterTurn` | 每回合后问一句"要停吗" |
| `getSteeringMessages` / `getFollowUpMessages` | 两种插队队列 |
| `beforeToolCall` / `afterToolCall` | 工具执行前后拦截（可 block/改写） |

看到 beforeToolCall 你应该会心一笑——这就是 dsh 第 22 讲 pre-execute 瀑布的回调版。**审批、日志、改写，都挂在这两个钩子上**。

## 事件：循环的对外广播

循环全程通过 `emit` 发 `AgentEvent` 联合事件（agent_start/turn_start/message_update/tool_execution_end/turn_end/agent_end…），TUI、日志、扩展全靠订阅这些事件工作。对照 dsh：dsh 把事件写进日志（拉模式），pi 把事件推给订阅者（推模式）——又一次殊途同归。

## 试一试

打开 agent-loop.ts 找到 runLoop，对照本讲伪代码标出：steering 注入在哪几行？工具调用判断在哪？`signal` 参数（AbortSignal）传给了谁——顺着它找到中断的传播路径。

## 下一讲预告
循环的搭档：Agent 类——状态管理、防御性拷贝、以及那个 593 行文件里的订阅体系。
