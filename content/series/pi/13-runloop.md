---
title: 第13讲·主循环 runLoop：内外双层 while
summary: 拆解 runLoop 的双层 while——外层在"等用户新消息"，内层在"本轮工具链自我迭代"，两个正交关注点被干净拆开。
objectives:
  - 说出 runLoop 外层 while 与内层 while 各自负责什么、何时退出
  - 解释为什么"输入边界"和"工具自省"要拆成两层而不是一层
  - 把双层 while 映射到 dsh 的 turn / step 概念
tags: [pi, agent-loop, 主循环]
keyPoints:
  - runLoop（agent-loop.ts:155）外层 while 在 drain steering/followUp 队列，队列空了才停——它定义了"一次用户轮次边界"（agent-loop.ts:170）
  - 内层 while 在同一批输入上反复"流式回复 → 执行工具 → 结果回灌"，直到模型不再要工具调用（agent-loop.ts:174）
  - 外层每转一圈发 turn_start，内层每跑一轮工具也发 turn_end，二者成对出现，正是 dsh 里 turn 与 step 同款哲学
  - 模型回复里出现 toolCall 就 hasMoreToolCalls=true 继续内层；否则内层收敛、退回外层看有没有 followUp
  - 双层结构让"有没有新输入"和"本轮工具链结束没"两个正交条件不再纠缠，避免漏消息或死循环
---

第 02 讲我们顺着"一次对话的生命线"跑了一遍，在 `runLoop` 面前匆匆路过。这一讲不留余地，把 `packages/agent/src/agent-loop.ts` 里这个双层 `while` 彻底拆开。pi 全部的"会自己干活"的魔力，最终都收在这对嵌套循环里。

## 一、先结论：两个 while 管两件正交的事

`runLoop` 定义在 `agent-loop.ts:155`。它的骨架可以这样读：

```ts
async function runLoop(initialContext, newMessages, initialConfig, signal, emit, streamFunction) {
	let currentContext = initialContext;
	let firstTurn = true;
	let pendingMessages = (await config.getSteeringMessages?.()) || [];   // 开跑前先看看有没有人插话

	while (true) {                              // —— 外层：输入边界 ——
		let hasMoreToolCalls = true;
		while (hasMoreToolCalls || pendingMessages.length > 0) {   // —— 内层：工具自省 ——
			if (!firstTurn) await emit({ type: "turn_start" });
			else firstTurn = false;

			if (pendingMessages.length > 0) {    // 把插话/转向消息先灌进上下文
				for (const message of pendingMessages) { /* emit + push */ }
				pendingMessages = [];
			}

			const message = await streamAssistantResponse(...);   // ① 向模型要回复
			newMessages.push(message);

			const toolCalls = message.content.filter((c) => c.type === "toolCall");
			hasMoreToolCalls = false;
			if (toolCalls.length > 0) {
				const executed = await executeToolCalls(...);      // ② 派发工具
				hasMoreToolCalls = !executed.terminate;            // 还有工具要跑 → 内层继续
				// 结果回灌 currentContext.messages
			}
			await emit({ type: "turn_end", message, toolResults });
			pendingMessages = (await config.getSteeringMessages?.()) || [];   // 跑完再探一次插话
		}

		const followUpMessages = (await config.getFollowUpMessages?.()) || [];  // 本该停了，看看收尾追加
		if (followUpMessages.length > 0) { pendingMessages = followUpMessages; continue; }
		break;                                  // 外层退出：彻底没活了
	}
	await emit({ type: "agent_end", messages: newMessages });
}
```

两个 `while` 的分工是整段设计的精髓：

- **外层 `while (true)`（`:170`）**：管"用户轮次边界"。它只在一种情况下停下——`getFollowUpMessages()` 也空了，`break`。换句话说，**只要还有没消费的输入（转向或收尾追加），它就再开一轮**。它回答的是"**什么时候该停下来**"。
- **内层 `while (hasMoreToolCalls || pendingMessages.length > 0)`（`:174`）**：在同一个上下文上反复"模型回复 → 执行工具 → 把结果喂回模型"。只要模型这次回复里还有 `toolCall`，`hasMoreToolCalls` 就为 `true`，内层继续转。它回答的是"**一轮内部怎么自我迭代**"——直到模型不再要求调用工具（转为普通文本），内层才退出。

> **一句话定义**：`turn` 是"用户提交一次输入到 agent 给出最终自然语言回复"的整段过程；`step` 是这段过程里"模型发一次工具调用、工具跑完、结果回灌"的单次自省。`turn` 包着若干 `step`，正如下面日志里 `turn_start/turn_end` 成对、内层每轮工具是一次 `step`。

## 二、为什么是两层，而不是一层

把两个关注点塞进一个 `while` 是最自然的直觉，但 pi 偏要拆。理由在注释和结构上写得很直白——**"有没有新输入"和"本轮工具链是否结束"是正交的**。

设想一个朴素单层循环，退出条件既要判断 `toolCalls.length` 又要判断 `queue.empty()`：

```ts
while (true) {
	const msg = await streamAssistantResponse(...);
	if (msg has no toolCall) {
		if (queue.empty()) break;        // 条件①：没工具也没新输入
		else continue;                    // 条件②：没工具但有新输入
	}
	await executeToolCalls(...);         // 有工具就跑
	// 但跑完到底 continue 还是 break，又得再判一次 queue
}
```

这里"工具链结束"和"队列空"纠缠在一起：模型说完了，可能你想插话（不能停），也可能你没话说（该停）。单层写法会在每个分支重复判断队列，一不留神就**漏掉插话**（直接 `break`）或**死循环**（永远 `continue` 却没新输入）。

pi 的解法干净：`外层`只认"队列空不空"，`内层`只认"工具链结束没"。两者通过 `pendingMessages` 这个交接变量通信——内层跑完一轮会再 `getSteeringMessages()` 探一次插话（`:259`），把结果交给外层下一圈处理。

> **知识拓展：和 dsh 的同款哲学**。第 13 讲的 dsh 把一次交互拆成 `turn`（用户一轮）与 `step`（模型一次工具自省）。pi 的 `runLoop` 是它的一一对应实现：`turn_start/turn_end` 由外层每圈发（`:176`、`:224`），内层每跑完一批工具发一次 `turn_end` 再决定是否开下一 `step`。你翻 pi 的调试日志，会看到外层和内层事件成对出现——这就是"turn/step 双层级"在 pi 里的落点。

## 三、内层怎么"自我收敛"：从 toolCall 到回灌

内层真正的驱动力是这一小段（`:203` 起）：

```ts
const toolCalls = message.content.filter((c) => c.type === "toolCall");   // 从回复里抠出工具调用
hasMoreToolCalls = false;                                                 // 先假设"这轮就到头"
if (toolCalls.length > 0) {
	const executedToolBatch =
		message.stopReason === "length"
			? await failToolCallsFromTruncatedMessage(toolCalls, emit)    // 输出被截断，工具参数可能不全，全判失败
			: await executeToolCalls(currentContext, message, config, signal, emit);
	toolResults.push(...executedToolBatch.messages);
	hasMoreToolCalls = !executedToolBatch.terminate;                      // 工具没说"终止"，就继续内层

	for (const result of toolResults) {
		currentContext.messages.push(result);                            // 结果回灌上下文
		newMessages.push(result);
	}
}
```

注意两个细节，这正是 pi 的工程严谨处：

1. **`stopReason === "length"` 的兜底**（`:211`）：如果模型回复是被 token 上限截断的，它发出的工具调用参数可能是半截 JSON。pi 不冒险执行，而是 `failToolCallsFromTruncatedMessage` 把每个调用都标记成错误，让模型在下轮重新发完整参数。这避免了"用残缺参数跑了一个危险工具"。
2. **`terminate` 标志**（`:216`）：`executeToolCalls` 返回的批次里若每个工具都 `terminate: true`，`hasMoreToolCalls` 才为 `false`。也就是说，工具本身可以"主动说停"——比如某个工具明确判定任务已完成。

工具结果被 `push` 进 `currentContext.messages`（`:218`），下一圈内层 `streamAssistantResponse` 就会把这个 `toolResult` 当作新上下文喂给模型。于是模型看到"我刚才调了 A、拿到结果 X"，据此决定下一步是再调 B，还是直接给出最终回答。**工具结果，就是内层循环自我燃烧的燃料。**

## 试一试

打开 `packages/agent/src/agent-loop.ts`，定位 `runLoop`（`agent-loop.ts:155`）：

1. 外层 `while` 的退出条件是哪一行（`break` 在哪）？这说明"用户轮次"何时算真正结束？
2. 内层 `while` 的退出条件有两种触发：`hasMoreToolCalls` 变 `false`（`:206`、`:216`）和 `pendingMessages` 清空。找一个场景——模型已经不再调工具，但用户发了 `steer` 插话——内层会怎么走？外层又会怎么走？
3. 把 `stopReason === "length"` 那段（`:211`）删掉会怎样？结合第 15 讲的 `prepareToolCall` 想想风险。

想通这两层循环的咬合，pi 的"心脏节拍"你就彻底掌握了。

## 下一讲预告

内层第一步 `streamAssistantResponse`（`agent-loop.ts:281`）我们刚才一直当黑盒用。下一讲掀开它：模型回复是怎么从 `AgentMessage[]` 跨包映射成 `pi-ai` 认识的 `Message[]` 的，以及一段流式的 token 如何实时拼回完整消息、并就地变成工具调用。
