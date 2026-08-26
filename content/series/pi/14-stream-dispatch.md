---
title: 第14讲·流式响应与工具派发
summary: streamAssistantResponse 如何把 AgentMessage 映射成 pi-ai 的 Message，再让一段段 token 实时拼回消息、就地析出工具调用。
objectives:
  - 说清 streamAssistantResponse 在 runLoop 里扮演的角色与返回物
  - 解释 convertToLlm 的跨包映射职责（agent 类型 → pi-ai 类型）
  - 描述一段流式事件如何逐步拼出完整 AssistantMessage 并析出 toolCall
tags: [pi, streaming, 工具派发]
keyPoints:
  - streamAssistantResponse（agent-loop.ts:281）是 runLoop 内层"向模型要回复"的唯一入口，返回拼好的 AssistantMessage
  - 跨包接缝靠 convertToLlm：agent 内部是 AgentMessage[]，pi-ai 要的是 Message[]，二者类型不同必须转换（harness/messages.ts:124）
  - 流式事件在 for-await 里逐步改写 partialMessage，text/thinking/toolcall 各自有 start/delta/end 三态，最终 response.result() 给出定稿
  - toolCall 不是事后解析，而是在 toolcall_delta 阶段用 parseStreamingJson 边流边凑参数，toolcall_end 时参数已完整
  - 流式响应落幕后，runLoop 用 message.content.filter(toolCall) 把工具调用交给 executeToolCalls，进入第15讲的执行
---

上一讲我们把 `runLoop` 的内层当成"发请求—拿回复"的黑盒。这一讲拧开这个黑盒：`streamAssistantResponse`（`agent-loop.ts:281`）。它干的事很朴素却关键——**把 agent 内部的对话记录，翻译成 `pi-ai` 能懂的格式，发给模型，再把模型一段段吐回来的 token 实时拼回一条完整消息**。

## 一、streamAssistantResponse 站在哪、干什么

在 `runLoop` 内层，它是"向模型要回复"的唯一调用点（`:193`）：

```ts
const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFunction);
newMessages.push(message);
```

函数签名（`agent-loop.ts:281`）：

```ts
async function streamAssistantResponse(
	context: AgentContext,
	config: AgentLoopConfig,
	signal: AbortSignal | undefined,
	emit: AgentEventSink,
	streamFunction: StreamFn,
): Promise<AssistantMessage> {        // 注意：返回的是 pi-ai 的 AssistantMessage
```

几个要点：

- 它吃进 `context.messages`（`AgentMessage[]`，agent 自己的类型），吐出 `AssistantMessage`（**`pi-ai` 的类型**）。这个"进/出类型不一致"本身就是跨包接缝的信号。
- 它不直接 `fetch` 任何供应商。真正发网络请求的是 `streamFunction`——一个可插拔的 `StreamFn`（定义在第 16 讲细讲）。这层抽象让 `pi-agent-core` 不依赖任何具体 LLM 客户端。
- 它边收流边 `emit` 事件（`message_start` / `message_update` / `message_end`），所以 TUI 才能"边想边画"。

## 二、跨包映射：convertToLlm 这道翻译关

函数开头两段准备（`:288`）：

```ts
let messages = context.messages;
if (config.transformContext) messages = await config.transformContext(messages, signal);  // 可选的上下文改写

const llmMessages = await config.convertToLlm(messages);   // AgentMessage[] → Message[]

const llmContext: Context = {
	systemPrompt: context.systemPrompt,
	messages: llmMessages,                  // 翻译后的消息
	tools: context.tools,
};
```

**为什么必须翻译？** 因为 `pi-agent-core` 定义的 `AgentMessage`（`role` 有 `user`/`assistant`/`toolResult`/`bashExecution`/`custom`/`branchSummary`/`compactionSummary` 等）和 `pi-ai` 要求的 `Message`（`role` 只有 `user`/`assistant`/`toolResult`）不是一回事。agent 内部要记"bash 执行记录""分支摘要"这类元消息，但喂给模型时得折叠成模型认得的角色。

翻译函数有两版：

- agent 自带的 `defaultConvertToLlm`（`agent.ts:33`）最简单——只保留 `user`/`assistant`/`toolResult` 三种角色，其余过滤掉。
- harness 用的 `convertToLlm`（`harness/messages.ts:124`）更全，把 `bashExecution`、`custom`、`branchSummary`、`compactionSummary` 都重写成 `user` 角色的文本块（比如分支摘要包上 `BRANCH_SUMMARY_PREFIX`）。

```ts
export function convertToLlm(messages: AgentMessage[]): Message[] {
	return messages
		.map((m): Message | undefined => {
			switch (m.role) {
				case "bashExecution": /* → user 文本 */ 
				case "custom":       /* → user 文本 */
				case "branchSummary":/* → user 文本（带前缀） */
				case "compactionSummary": /* → user 文本（带前缀） */
				case "user":
				case "assistant":
				case "toolResult":
					return m;                  // 这三种原样透传
				default:
					return undefined;          // 其余丢弃
			}
		})
		.filter((m): m is Message => m !== undefined);
}
```

> **一句话定义**：`convertToLlm` 是"agent 世界 → 模型世界"的翻译器。它保证模型只看到自己能处理的角色，同时把 agent 的内部元信息（如压缩摘要）以文本形式带进去，不浪费上下文。这道关也是第 05–06 讲"消息模型与流式事件"在运行时真正被调用的地方。

## 三、流式拼装：一段段 token 如何变成一条消息

翻译完，调用 `streamFunction` 拿到一个事件流，然后用 `for await` 逐事件拼装（`:308`、`:317`）：

```ts
const response = await streamFunction(config.model, llmContext, { ...config, apiKey, signal });

let partialMessage: AssistantMessage | null = null;
let addedPartial = false;

for await (const event of response) {
	switch (event.type) {
		case "start":
			partialMessage = event.partial;
			context.messages.push(partialMessage);      // 先把空壳放进上下文
			addedPartial = true;
			await emit({ type: "message_start", message: { ...partialMessage } });
			break;
		case "text_start": case "text_delta": case "text_end":
		case "thinking_start": case "thinking_delta": case "thinking_end":
		case "toolcall_start": case "toolcall_delta": case "toolcall_end":
			if (partialMessage) {
				partialMessage = event.partial;          // 每个 delta 都带着"当前完整 partial"
				context.messages[context.messages.length - 1] = partialMessage;  // 原地替换成最新版
				await emit({ type: "message_update", message: { ...partialMessage } });
			}
			break;
		case "done": case "error":
			const finalMessage = await response.result();   // 取最终定稿
			// 替换/补回上下文，emit message_end，return
			return finalMessage;
	}
}
```

三处细节值得停下来看：

1. **`partial` 是"带着迄今所有内容的快照"**。每个 `text_delta` / `toolcall_delta` 事件都附带一个 `partial` 字段，它是到这一刻为止的完整消息。pi 不做"增量拼接字符串"的脏活，而是直接把 `partialMessage` 换成最新快照（`:336`）。这让 `emit` 出去的 `message_update` 永远是"当前可见的全貌"，TUI 拿到就能整体重绘。
2. **`text` 与 `thinking` 分开两路**。模型边想边说的"思考过程"（`thinking_*`）和真正回复（`text_*`）是两套独立事件，下游可以分别渲染成灰色小字和正式回答。
3. **工具调用是"边流边凑"的**。`toolcall_start` 时放一个空 `toolCall` 壳；`toolcall_delta` 时把增量 JSON 用 `parseStreamingJson` 解析、补进 `arguments`；`toolcall_end` 时参数已经完整。所以模型还在吐参数途中，pi 这边就已经有了一个不断变完整的 `toolCall` 对象——这为"边流式边高亮即将调用的工具"提供了数据。

> **知识拓展**：`parseStreamingJson` 是容错解析——半截 JSON 返回 `{}` 而不是抛错，等 `toolcall_end` 才拿到完整参数。配合上一讲 `stopReason === "length"` 的兜底，pi 在"流式工具调用"这种最容易出错的场景里格外稳。

## 四、落幕即派发：从消息到工具调用

流走完了，`streamAssistantResponse` 返回拼好的 `AssistantMessage`。回到 `runLoop` 内层（`:203`）：

```ts
const toolCalls = message.content.filter((c) => c.type === "toolCall");   // 从内容里抠工具调用
hasMoreToolCalls = false;
if (toolCalls.length > 0) {
	const executedToolBatch = await executeToolCalls(currentContext, message, config, signal, emit);
	// … 结果回灌 …
}
```

注意：**工具调用不是"解析"出来的，而是流式拼装时就已经是消息内容里的一类 `content` 块**。这里只是 `filter` 一下就拿出来，直接交给 `executeToolCalls`——这正是下一讲的主角。所以从"模型回复"到"工具派发"之间没有任何文本正则解析，类型系统全程保驾。

## 试一试

打开 `packages/agent/src/agent-loop.ts`，看 `streamAssistantResponse`（`agent-loop.ts:281`）：

1. `convertToLlm` 在 `:295` 被调用。如果把它换成恒等函数（直接返回 `messages`），`bashExecution` 这类角色进到 `pi-ai` 会发生什么？（提示：`pi-ai` 的 `Message.role` 只有三种。）
2. `for await` 里 `context.messages[context.messages.length - 1] = partialMessage`（`:337`）为什么要"原地替换最后一条"？如果改成 `push` 会怎样？
3. 找一个 `toolcall_delta` 分支（`:332`），确认 `partialMessage` 在此时已经含有一个 `arguments` 正在增长的 `toolCall`。这说明"工具派发"在第 15 讲开始时，参数是否可能已经就绪？

## 下一讲预告

工具调用已经从消息里抠出来了，接下来就是第 15 讲：`executeToolCalls` 怎么决定"顺序跑还是并发跑"（`agent-loop.ts:411`），`prepareToolCall` 在真正执行前又做了哪些校验与拦截（`agent-loop.ts:600`）。
