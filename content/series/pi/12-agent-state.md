---
title: 第12讲·Agent 类与 MutableAgentState
summary: 一个 Agent 实例如何同时持有"可变的对话记录"与"不可变快照"，靠 copy-on-write 让并发订阅者永不读到半成品。
objectives:
  - 说出 Agent 类的四个核心职责（持状态、发事件、跑工具、管队列）
  - 解释 MutableAgentState 为什么用 getter/setter 做 copy-on-write 而非裸数组
  - 区分 runWithLifecycle 与 processEvents 各自负责什么
tags: [pi, agent-core, 状态管理]
keyPoints:
  - Agent 是"运行时核心"，把对话记录、生命周期事件、工具执行、steer/followUp 队列收在一个实例里（agent.ts:173）
  - MutableAgentState 用 getter/setter 拦截 tools/messages 的赋值，强制每次写入都拷一份新数组，避免外部持有引用后改坏内部状态（agent.ts:61）
  - runWithLifecycle（agent.ts:486）只管"开始/收尾/抛错"三段式，不碰具体循环逻辑；真正的轮子由 agent-loop 转
  - processEvents（agent.ts:544）是唯一的"状态归约 + 广播"点，所有生命周期事件先改 _state 再挨个通知 listener
  - 朴素可变 Agent 把 messages 直接暴露成 public 数组，会让 TUI 渲染线程读到还没拼完的流式消息——pi 用私有 _state 封死这条路
---

如果把 pi 比作一台发动机，前六讲我们一直在看它的油路（pi-ai 的多供应商抽象）和点火线（流式事件）。这一讲我们拧开缸盖，看真正把油点着、把车推走的那个零件——`pi-agent-core` 包里的 `Agent` 类。它不大，却把"对话记忆、事件广播、工具执行、用户输入队列"四件事收在一个实例里。理解了它，你就理解了 pi 为什么能既被 CLI 用、又被服务端 harness 用。

## 一、Agent 是什么：一个四类职责的状态机

`Agent` 类定义在 `packages/agent/src/agent.ts:173`，类注释一句话点明身份——"the low-level agent loop 的有状态包装"。拆开看，它身上挂着四组东西：

```ts
export class Agent {
	private _state: MutableAgentState;                                   // ① 当前对话与运行时状态
	private readonly listeners = new Set<(event, signal) => ...>();      // ② 生命周期事件订阅者
	private readonly steeringQueue: PendingMessageQueue;                 // ③ 转向队列（用户中途插话）
	private readonly followUpQueue: PendingMessageQueue;                 // ④ 收尾后追加队列
	// … 一堆公开的配置字段：streamFunction / convertToLlm / toolExecution …
}
```

四个箭头各管一件：

- **① `_state`**：整段对话的"记忆"。模型回的每条消息、工具出的每个结果、当前是否正在流式输出（`isStreaming`）、还有哪些工具调用没跑完（`pendingToolCalls`），全在这。
- **② `listeners`**：谁想看 agent 心跳，就 `subscribe()` 进来。TUI 靠它把事件画成屏幕——这一点我们在第 02 讲已经见识过。
- **③ `steeringQueue` / ④ `followUpQueue`**：两个待办信箱。`steer()` 是"本轮助手说完之前插的话"，`followUp()` 是"agent 本该停了之后再补的话"。它们让用户在 agent 跑得正欢时也能塞消息，而不必另开一个进程。

关键认知：**`Agent` 自己不实现"模型怎么调用、工具怎么跑"**。`prompt()`（`agent.ts:348`）只是把输入规范化，然后交给我们第 02 讲见过的 `runWithLifecycle` → `runAgentLoop` → `runLoop`。`Agent` 负责"舞台与灯光"，`agent-loop` 负责"演员的走位"。

> **一句话定义**：`MutableAgentState` 是 `Agent` 内部那块"运行时黑板"，它和对外暴露的 `AgentState` 几乎是同一份字段，但把 `messages`/`tools` 这类会被频繁改动的数组做成了"写入即拷贝"的属性。为什么需要它？因为同一份 `messages` 可能同时被循环体（写）和 TUI 监听器（读）碰到，裸数组会让读者读到一半改写的垃圾。

## 二、为什么状态要 copy-on-write：MutableAgentState 的玄机

`MutableAgentState` 的定义在 `agent.ts:61`，注意它不是普通接口，而是一个带 getter/setter 的类型：

```ts
type MutableAgentState = Omit<AgentState, "isStreaming" | "streamingMessage" | "pendingToolCalls" | "errorMessage"> & {
	isStreaming: boolean;
	streamingMessage?: AgentMessage;
	pendingToolCalls: Set<string>;
	errorMessage?: string;
};
```

它"继承"了 `AgentState` 绝大部分字段，但把四个运行时才有的字段（`isStreaming` 等）单独拎出来。真正有意思的是它的构造器 `createMutableAgentState`（`agent.ts:68`），`tools` 和 `messages` 不是普通属性，而是 getter/setter：

```ts
let tools = initialState?.tools?.slice() ?? [];     // 先用 slice 拷一份
let messages = initialState?.messages?.slice() ?? [];
return {
	// … 其他直接赋值的字段 …
	get tools() { return tools; },                  // 读：返回当前那份
	set tools(nextTools) { tools = nextTools.slice(); },   // 写：再拷一份再存
	get messages() { return messages; },
	set messages(nextMessages) { messages = nextMessages.slice(); },
	// …
};
```

每一处 `= ` 赋值都先 `.slice()` 拷一份。这就是 **copy-on-write（写时复制）**：外部拿到的永远是某一时刻的快照引用，谁想改都得先克隆，绝不会原地 mutate 那块被别人正读着的数组。

**对比一个朴素可变 Agent**，问题就清楚了。若写成这样：

```ts
class NaiveAgent {
	messages: AgentMessage[] = [];   // 裸 public 数组
}
const a = new NaiveAgent();
const snapshot = a.messages;        // 外部拿到引用
a.messages.push(assistantMsg);     // 循环体边流式边 push
// 此时 snapshot 也变了——TUI 渲染线程会读到"拼到一半"的消息
```

pi 用私有 `_state` 加 getter/setter 把这条路封死：`state` 的 getter（`agent.ts:260`）只暴露读权限；任何"写入"都走 `messages` setter 做一次拷贝，旧引用持有者看到的仍是旧数组。配合 `runLoop` 里"先 push 完整消息、再 emit `message_end`"的顺序（`agent-loop.ts:556`），订阅者永远只会读到已定型的内容。

> **知识拓展**：为什么不用 `Immutable.js` 那种真不可变结构？因为 pi 的目标是"写入即拷贝、读取零成本"，`slice()` 一次浅拷贝足够——消息对象本身不会被循环体改字段，只是数组会被换。浅拷贝数组、共享内部元素，是这里性价比最高的选择。

## 三、runWithLifecycle 与 processEvents：一对"闸刀与广播塔"

`Agent` 把"一次运行"的骨架收敛到两个私有方法，分工极干净。

`runWithLifecycle`（`agent.ts:486`）只做三段式**闸刀**控制：

```ts
private async runWithLifecycle(executor: (signal) => Promise<void>): Promise<void> {
	if (this.activeRun) throw new Error("Agent is already processing.");  // 防重入
	const abortController = new AbortController();
	this.activeRun = { promise, resolve, abortController };              // 登记"当前运行"
	this._state.isStreaming = true;                                      // 点亮流式标志
	try {
		await executor(abortController.signal);                          // 真正去跑循环
	} catch (error) {
		await this.handleRunFailure(error, abortController.signal.aborted);  // 失败转成事件
	} finally {
		this.finishRun();                                                // 清场
	}
}
```

它不关心循环内部怎么转，只关心三件事：**不允许嵌套运行**（`activeRun` 已存在就抛错）、**开跑前点亮 `isStreaming`**、**无论成败都要 `finishRun()` 清掉运行时状态**。注意 `prompt()`（`agent.ts:351`）在进 `runWithLifecycle` 之前也会先查 `activeRun`——双层保险，保证一个 `Agent` 同一时刻只有一条时间线。

真正"收消息、改黑板、喊大家看"的是 `processEvents`（`agent.ts:544`），它是全类唯一的**广播塔**：

```ts
private async processEvents(event: AgentEvent): Promise<void> {
	switch (event.type) {
		case "message_start":
			this._state.streamingMessage = event.message; break;        // 改黑板：记下正在流的消息
		case "message_end":
			this._state.streamingMessage = undefined;
			this._state.messages.push(event.message); break;            // 改黑板：定稿入册
		case "tool_execution_start": { /* pendingToolCalls.add */ }
		case "tool_execution_end":   { /* pendingToolCalls.delete */ }
		// … turn_end / agent_end 也在此归约 …
	}
	const signal = this.activeRun?.abortController.signal;
	for (const listener of this.listeners) {
		await listener(event, signal);                                  // 广播给所有订阅者
	}
}
```

所有 `agent-loop` 吐出来的事件，先在这里落进 `_state`（归约），再挨个 `await` 通知 `listeners`。顺序很关键：**先改状态、再通知**，所以任意 listener 被调用时，看到的 `state` 已经是"事件之后"的一致版本，不会有竞态。

> **回到第 02 讲**：你在 `interactive-mode.ts` 里见到的 `session.subscribe(handleEvent)`，订阅的就是这同一个 `processEvents` 广播出来的 `AgentEvent`。agent 自己不知道屏幕，它只管往 `listeners` 里喊；这一讲的 `_state` 就是喊话时附带的"当前黑板快照"。

## 试一试

打开 `packages/agent/src/agent.ts`，找到三处并回答：

1. `createMutableAgentState`（`agent.ts:68`）里 `messages` 的 setter 为什么要 `nextMessages.slice()`？如果去掉 `.slice()`，第 02 讲里 TUI 的 `handleEvent` 可能在什么时机读到脏数据？
2. `prompt()`（`agent.ts:348`）和 `runWithLifecycle`（`agent.ts:486`）都检查了 `activeRun`。哪一处是"用户直接重入"的防御，哪一处是"内部逻辑重入"的防御？
3. `processEvents`（`agent.ts:544`）里，如果把"广播给 listeners"放到"改 `_state`"之前，会发生什么竞态？

想通这三点，你就摸到了 pi 状态管理的底。

## 下一讲预告

这一讲我们把舞台搭好了，`runWithLifecycle` 里那句 `await executor(...)` 真正调用的，是 `agent-loop.ts` 的 `runLoop`。下一讲我们钻进主循环，看清那对"外层管输入边界、内层管工具自省"的双层 `while` 到底怎么咬合。
