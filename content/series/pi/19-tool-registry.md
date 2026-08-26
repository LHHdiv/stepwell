---
title: 第19讲·工具注册表 defineTool
summary: 一个工具是怎么被"登记"进 pi 的——defineTool 只有一行，却串起了类型、schema 与运行时三件事。
objectives:
  - 说出 defineTool 存在的理由：为什么不直接写对象而要包一层
  - 讲清 ToolDefinition 里 execute / renderCall / renderResult 三个字段各自服务谁
  - 把工具注册和前面第 14-15 讲的工具执行链路连起来
tags: [pi, 工具系统, defineTool, 类型推断]
keyPoints:
  - "defineTool（extensions/types.ts:509）本质只是 identity 函数，但它保留了泛型 TParams 的类型推断，避免把参数 schema 推宽为 unknown"
  - "ToolDefinition（extensions/types.ts:447 起）核心是 execute(params, signal, onUpdate, ctx)，外加可选的 renderCall / renderResult 自定义终端渲染"
  - "工具的参数用 TypeBox 的 TSchema 描述（如 t.Object({...})），运行时既做校验也生成给模型看的工具 schema"
  - "工具最终进入 AgentSession 的 _toolRegistry（agent-session.ts:908 的 getAllTools），由 setActiveToolsByName（:928）按名字启用"
  - "defineTool 是纯描述，真正'执行'发生在第 14-15 讲的 executeToolCalls，二者通过一个共享的名称字符串连接"
---

第 14 讲我们跟着 `executeToolCalls` 一路追到工具真正被调用，却始终没看清：**一个工具在被调用之前，是怎么"存在"于 pi 里的？** 这一讲把镜头拉到更早的瞬间——工具的定义与登记。你会发现，pi 把"工具"这件事拆成了"描述"和"执行"两半，而连接它们的，只是一行看似多余的 `defineTool`。

## 一、先结论：defineTool 是"类型保镖"，不是"注册动作"

先看 `packages/coding-agent/src/core/extensions/types.ts:509`：

```ts
export function defineTool<TParams extends TSchema, TDetails = unknown, TState = any>(
	tool: ToolDefinition<TParams, TDetails, TState>,
): ToolDefinition<TParams, TDetails, TState> & AnyToolDefinition {
	return tool as ToolDefinition<TParams, TDetails, TState> & AnyToolDefinition;
}
```

整段函数体只有一行 `return tool`——它**什么都没做**，只是把入参原样返回。那它存在的意义是什么？答案是**类型推断**。

- 当你把工具塞进数组（比如 `customTools: ToolDefinition[]`）或传给需要上下文推断的函数时，TypeScript 会把泛型 `TParams` 推宽为 `unknown`，于是你在 `execute` 里写 `params.path` 会直接报错。
- 用 `defineTool(myTool)` 包一层，编译器就能从 `myTool` 的字面量反推出 `TParams` 的具体类型，后续 `params` 的字段就有完整提示和校验。

> **知识拓展**：这种"identity 函数只为保留类型"的写法在 TypeScript 库里很常见，比如 Zod 的 `z.infer`、tRPC 的 `router()`。它没有运行时开销，纯粹是给编译器的一张"类型保票"。

## 二、ToolDefinition：工具的"身份证"

真正的重量在 `ToolDefinition` 接口（`extensions/types.ts:447` 起）。它描述了一个工具的全部元数据：

```ts
interface ToolDefinition<TParams, TDetails, TState> {
	name: string;                                  // 工具名，模型靠它点名调用
	description: string;                           // 给模型看的功能说明
	parameters: TParams;                           // TypeBox schema，既校验入参也生成工具 schema
	promptGuidelines?: string;                     // 注入系统提示，教模型何时用这个工具
	execute(
		toolCallId: string,
		params: Static<TParams>,                   // 校验后的参数，类型由 TParams 推出
		signal: AbortSignal | undefined,           // 取消信号，支持用户 Ctrl-C 中断
		onUpdate: AgentToolUpdateCallback<TDetails> | undefined,  // 流式进度回调
		ctx: ExtensionContext,                     // 扩展运行上下文
	): Promise<AgentToolResult<TDetails>>;
	renderCall?: (args, theme, context) => Component;     // 自定义"调用中"的终端渲染
	renderResult?: (result, options, theme, context) => Component;  // 自定义"结果"的终端渲染
}
```

三个字段分工清晰：

1. **`execute`** 是唯一的必填动作——工具真正干活的地方。注意它拿 `AbortSignal` 和 `onUpdate`：意味着工具可以是**可中断、可流式汇报进度**的，而不只是"黑盒跑完给结果"。
2. **`renderCall` / `renderResult`** 是可选钩子。pi 的终端 UI（第 29–32 讲）会调用它们渲染工具调用，所以同一套工具定义，能同时服务"模型调度"和"人类观感"两件事。
3. **`parameters`** 用 TypeBox（`TSchema`）描述。这一点很关键：它**一份 schema 两用**——运行时校验模型传来的 JSON，同时直接序列化成给模型看的 tool schema。第 12 讲提到的"类型即契约"在这里落地。

## 三、从"描述"到"可用"：进入注册表

`defineTool` 只产生一个描述对象，还不能被调用。它要进入 `AgentSession` 内部的注册表才生效。看 `packages/coding-agent/src/core/agent-session.ts:908`：

```ts
getAllTools(): ToolInfo[] {
	return Array.from(this._toolDefinitions.values()).map(({ definition, sourceInfo }) => ({
		name: definition.name,
		description: definition.description,
		parameters: definition.parameters,
		promptGuidelines: definition.promptGuidelines,
		sourceInfo,   // 标记这个工具来自内置、customTools 还是某个扩展
	}));
}
```

每个工具都带 `sourceInfo`，记录它的来源（内置 / 配置 / 扩展）。而 `setActiveToolsByName`（`:928`）则决定"此刻哪些工具对模型可见"：

```ts
setActiveToolsByName(toolNames: string[]) {
	const tools: AgentTool[] = [];
	for (const name of toolNames) {
		const tool = this._toolRegistry.get(name);
		if (tool) { tools.push(tool); validToolNames.push(name); }
	}
	this.agent.state.tools = tools;
	this._baseSystemPrompt = this._rebuildSystemPrompt(validToolNames);  // 工具变了，系统提示也要重建
}
```

注意最后一行：切换工具集不只是改个列表，还会**重建系统提示**——因为提示里要告诉模型"你现在能用哪些工具"。这正好呼应第 01 讲"配置即提示"的思路。

## 四、和前面执行链路的咬合

现在把第 14–15 讲的内容接回来：

- 第 14 讲 `streamAssistantResponse` 让模型吐出 `toolCall`，里面带的 `name` 字符串，正是这里 `ToolDefinition.name`。
- 第 15 讲 `executeToolCalls` 用这个名字去注册表查到 `ToolDefinition`，调用它的 `execute`，再把 `AgentToolResult` 回灌上下文。
- 中间的"连接物"，就是一个**字符串名字**。`defineTool` 负责保证这个名字和真实实现、真实类型一一对应；`executeToolCalls` 负责在运行时按名字找人。

> **一句话总结**：`defineTool` 是"登记身份证"，`AgentSession._toolRegistry` 是"户口本"，`executeToolCalls` 是"按名点卯"。三者靠工具名这一个字符串串成闭环。

## 五、试一试

1. 打开 `packages/coding-agent/examples/extensions/hello.ts:25`，看一个最小 `pi.registerTool({...})` 长什么样；对比 `defineTool` 的返回类型，理解为什么扩展里用的是 `registerTool` 而文档示例用 `defineTool`。
2. 在 `agent-session.ts` 里搜索 `_toolDefinitions`，数一数工具是以什么数据结构存储的（提示：看 `.values()` 和 `.get(name)` 的调用，推断它是 `Map` 还是数组）。
3. 思考：`parameters` 用 TypeBox 而非普通 TS 类型，除了"生成 schema"，还有什么运行时好处？（提示：校验失败时你能拿到结构化的错误。）

## 下一讲预告

工具有了"身份证"，但 pi 真正厉害的不是单个工具，而是**几十个工具可以靠扩展系统成批注入**。下一讲我们就走进 `ExtensionAPI`，看 pi 如何把"支持哪些工具、哪些命令、哪些快捷键"全部开放给扩展去决定——这才是它相对 dsh 最激进的一步。
