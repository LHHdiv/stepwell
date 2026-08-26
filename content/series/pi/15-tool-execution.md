---
title: 第15讲·顺序与并发工具执行
summary: executeToolCalls 如何在顺序与并发间二选一，prepareToolCall 在执行前做校验与拦截，结果再回灌循环成为下轮燃料。
objectives:
  - 说清 executeToolCalls 选择顺序/并发的两个判据
  - 解释 prepareToolCall 在真正执行前完成的四件事
  - 描述工具结果如何被打包成 toolResult 消息回灌 runLoop
tags: [pi, 工具执行, 并发]
keyPoints:
  - executeToolCalls（agent-loop.ts:411）先查"全局 toolExecution 或单个工具标了 sequential"再决定走哪条路（agent-loop.ts:422）
  - 顺序路径 executeToolCallsSequential（agent-loop.ts:433）一个接一个跑，适合工具间有依赖
  - 并发路径 executeToolCallsParallel（agent-loop.ts:489）先逐個 prepare，再用 Promise.all 并发执行无依赖工具
  - prepareToolCall（agent-loop.ts:600）统一做：找工具、校验参数、跑 beforeToolCall 钩子、可被 block 中断
  - 结果经 createToolResultMessage 包成 role:"toolResult" 消息，由 runLoop 回灌上下文驱动下一轮
---

第 14 讲里，工具调用从流式消息里被 `filter` 出来，交到 `executeToolCalls` 手上。这一讲看它怎么把"调用清单"真正变成"运行结果"。核心是两条路——**顺序**与**并发**——以及一个所有调用都要先过的"安检门" `prepareToolCall`。

## 一、先分流：什么时候顺序，什么时候并发

`executeToolCalls` 在 `agent-loop.ts:411`，它自己不跑工具，只做**路由判断**（`:418`）：

```ts
async function executeToolCalls(currentContext, assistantMessage, config, signal, emit) {
	const toolCalls = assistantMessage.content.filter((c) => c.type === "toolCall");
	const hasSequentialToolCall = toolCalls.some(
		(tc) => currentContext.tools?.find((t) => t.name === tc.name)?.executionMode === "sequential",
	);
	if (config.toolExecution === "sequential" || hasSequentialToolCall) {
		return executeToolCallsSequential(...);     // 顺序路径
	}
	return executeToolCallsParallel(...);          // 并发路径
}
```

两个判据，满足任一就走顺序：

1. **全局开关 `config.toolExecution`**：`Agent` 构造时默认 `"parallel"`（`agent.ts:237`），但调用方可以强制 `"sequential"`。
2. **单个工具自己标了 `executionMode: "sequential"`**：即使全局允许并发，只要这批调用里**有一个**工具要求顺序，整批就退化为顺序（`:419`）。因为并发批次里一旦混了有依赖的工具，谁先跑谁后跑就不确定了。

> **一句话定义**：`toolExecution` 是"一条助手消息里包含多个工具调用时"的执行策略。顺序=串行、可控、慢但安全；并发=并行、快、只适用于彼此无依赖的工具。注意它管的是"同一助手消息内部的多个调用"，不是跨轮次。

**何时该并发？** 当模型在一次回复里同时要查天气、读文件、列目录——这些互不相干，并发能显著省时间。

**何时必须顺序？** 当工具 A 的输出是工具 B 的输入（比如"先写文件再运行它"），或某个工具会改全局状态（如切换 git 分支）。pi 用"单工具可声明 sequential"来兜底，即使你忘了设全局顺序，敏感的那个工具也能强制串行。

## 二、顺序路径：一个接一个，跑完才下一个

`executeToolCallsSequential`（`agent-loop.ts:433`）是一个朴素的 `for` 循环：

```ts
for (const toolCall of toolCalls) {
	await emit({ type: "tool_execution_start", toolCallId, toolName, args });   // 广播：开始
	const preparation = await prepareToolCall(currentContext, assistantMessage, toolCall, config, signal);  // 安检门
	let finalized;
	if (preparation.kind === "immediate") {
		finalized = { toolCall, result: preparation.result, isError: preparation.isError };  // 未执行就出结果（如工具不存在）
	} else {
		const executed = await executePreparedToolCall(preparation, signal, emit);          // 真正执行
		finalized = await finalizeExecutedToolCall(currentContext, assistantMessage, preparation, executed, config, signal);
	}
	await emitToolExecutionEnd(finalized, emit);
	const toolResultMessage = createToolResultMessage(finalized);   // 包成 toolResult 消息
	await emitToolResultMessage(toolResultMessage, emit);
	finalizedCalls.push(finalized);
	if (signal?.aborted) break;                                     // 被 abort 就停
}
```

每轮都**先 `prepareToolCall` 再过 `executePreparedToolCall`**，所以"校验"和"执行"严格分离。工具结果被 `createToolResultMessage` 包成 `role: "toolResult"` 的消息，立刻 `emit` 出去——TUI 就能实时显示"这个工具跑完了、结果是……"。

## 三、并发路径：先备齐，再一起放

`executeToolCallsParallel`（`agent-loop.ts:489`）的巧思在"准备与执行分两阶段"：

```ts
const finalizedCalls: FinalizedToolCallEntry[] = [];
for (const toolCall of toolCalls) {
	await emit({ type: "tool_execution_start", ... });
	const preparation = await prepareToolCall(...);          // 阶段一：逐個准备（顺序）
	if (preparation.kind === "immediate") {
		finalizedCalls.push({ toolCall, result, isError });  // 立即结果直接存
		continue;
	}
	finalizedCalls.push(async () => {                         // 阶段二：把"执行"包成 thunk
		const executed = await executePreparedToolCall(preparation, signal, emit);
		const finalized = await finalizeExecutedToolCall(...);
		await emitToolExecutionEnd(finalized, emit);
		return finalized;
	});
}
const orderedFinalizedCalls = await Promise.all(            // 并发执行所有 thunk
	finalizedCalls.map((entry) => (typeof entry === "function" ? entry() : Promise.resolve(entry))),
);
```

注意：

- **prepare 仍是顺序的**（循环里逐个 `await prepareToolCall`）。因为 `prepareToolCall` 可能跑 `beforeToolCall` 钩子、读上下文，这些不贵、且需要确定性顺序。
- **真正 execute 才并发**：每个工具的执行被包成 `async () => {...}` 的 thunk，最后 `Promise.all` 一把放出。互不依赖的工具同时跑。
- **结果顺序被保住**：`Promise.all` 返回的数组顺序和 `toolCalls` 输入顺序一致（`:540`）。但 `tool_execution_end` 事件的发射时机是"各工具自己跑完时"，所以 UI 上"完成高亮"是按真实完成顺序闪的，而最终 `toolResult` 消息数组是源顺序——这正是 `types.ts:42` 注释里说的"end 事件按完成序、result 消息按源序"。

> **知识拓展**：为什么不直接 `toolCalls.map(tc => execute(tc))`？因为那样 `prepareToolCall` 也会并发，而 `beforeToolCall` 钩子可能依赖上下文、也可能想"按顺序逐个决定是否放行"。pi 把"准备"留在单线程，把"耗时执行"丢给并发，兼顾了确定性与性能。

## 四、安检门 prepareToolCall：每个调用都要过

无论走哪条路，每个工具调用都先过 `prepareToolCall`（`agent-loop.ts:600`，原文 `:607` 为签名收尾括号，函数体起于 `:600`）。它做四件事：

```ts
async function prepareToolCall(currentContext, assistantMessage, toolCall, config, signal) {
	const tool = currentContext.tools?.find((t) => t.name === toolCall.name);
	if (!tool) {                                    // ① 找不到工具 → 立即错误结果
		return { kind: "immediate", result: createErrorToolResult(`Tool ${toolCall.name} not found`), isError: true };
	}
	try {
		const preparedToolCall = prepareToolCallArguments(tool, toolCall);    // ② 工具自定义参数预处理
		const validatedArgs = validateToolArguments(tool, preparedToolCall); // ③ 按 schema 校验参数
		if (config.beforeToolCall) {
			const beforeResult = await config.beforeToolCall({ assistantMessage, toolCall, args: validatedArgs, context }, signal);
			if (signal?.aborted) return { kind: "immediate", result: createErrorToolResult("Operation aborted"), isError: true };
			if (beforeResult?.block) {                    // ④ 钩子可 block：直接判失败，还可标 terminate
				const result = createErrorToolResult(beforeResult.reason || "Tool execution was blocked");
				if (beforeResult.terminate === true) result.terminate = true;
				return { kind: "immediate", result, isError: true };
			}
		}
		return { kind: "prepared", toolCall, tool, args: validatedArgs };     // 通过 → 交给执行器
	} catch (error) {
		return { kind: "immediate", result: createErrorToolResult(...), isError: true };  // 校验抛错也算失败
	}
}
```

四步层层设防：

1. **找工具**：名字对不上直接返回错误结果（不抛异常——保持"工具失败也是一条结果"的契约，让模型能自我修正）。
2. **参数预处理**：工具可声明 `prepareArguments` 做默认值填充之类。
3. **schema 校验**：`validateToolArguments` 用 `pi-ai` 的类型定义校验参数，残缺/类型错就抛错 → 落入 `catch` 变成错误结果。
4. **`beforeToolCall` 钩子**：这是 pi 的"软权限系统"接缝。钩子返回 `{ block: true }` 就能拦下工具，返回 `{ terminate: true }` 还能让整轮循环收敛（第 13 讲 `hasMoreToolCalls = !executed.terminate`）。第 03 讲提过 pi"没有内置权限系统、把信任交给进程分离"，`beforeToolCall` 就是进程内最后一道可插拔的闸。

通过安检后返回 `kind: "prepared"`，带已校验的 `args`；未通过则返回 `kind: "immediate"`（带着现成的错误结果，跳过执行）。

## 五、结果回灌：工具怎么驱动下一轮

两类路径最后都走 `createToolResultMessage`（`agent-loop.ts:777`）：

```ts
function createToolResultMessage(finalized): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: finalized.toolCall.id,
		toolName: finalized.toolCall.name,
		content: finalized.result.content ?? [],     // 空结果也归一化成空数组，避免 null 进历史
		details: finalized.result.details,
		usage: finalized.result.usage,
		isError: finalized.isError,
		timestamp: Date.now(),
	};
}
```

`role: "toolResult"` 是 `pi-ai` 认识的三种角色之一。回到 `runLoop` 内层（`:218`），这些消息被 `push` 进 `currentContext.messages`，下一圈 `streamAssistantResponse` 就会把它当作新上下文喂给模型。于是"工具结果 → 模型看到 → 再决定调不调工具"的闭环完成。**工具结果，是内层循环自我燃烧的燃料**——这和上一讲、第 13 讲的结论首尾呼应。

## 试一试

打开 `packages/agent/src/agent-loop.ts`：

1. `executeToolCalls`（`:411`）里 `hasSequentialToolCall`（`:419`）判断：如果一批调用含 3 个工具，其中 1 个标了 `sequential`，整批会怎么跑？为什么不是"那个串行、另两个并发"？
2. 并发路径 `:540` 的 `Promise.all` 保证什么顺序？而 `tool_execution_end` 的 `emit` 在 `:532` 又在什么时机？两者差异对 TUI 意味着什么？
3. `prepareToolCall`（`:600`）里若 `beforeToolCall` 返回 `{ block: true, terminate: true }`，对第 13 讲 `runLoop` 内层的 `hasMoreToolCalls` 有何影响？

## 下一讲预告

执行工具要发网络请求吗？不一定——调用 LLM 本身走的是另一条可插拔通道 `StreamFn`。下一讲我们看 `proxy.ts` 的 `streamProxy`（`proxy.ts:118`）和 `StreamFn` 接缝（`types.ts:28`）：为什么"怎么把请求发出去"是 pi 故意留给你替换的口子。
