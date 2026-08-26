---
title: 第16讲·工具代理与 StreamFn 接缝
summary: 把"怎么调用 LLM"抽象成可插拔的 StreamFn 接缝，streamProxy 演示如何经由服务端代理转发请求，而不动一行循环代码。
objectives:
  - 说清 StreamFn 这个接缝的职责与契约
  - 解释 streamProxy 如何把 LLM 请求转成经过服务端代理的 SSE 流
  - 描述一个代理可以怎样拦截/重定向工具流式的 partial 事件
tags: [pi, streamfn, 代理]
keyPoints:
  - StreamFn 是"发一次 LLM 请求、返回事件流"的可插拔函数，类型定义在 types.ts:28，pi-agent-core 不绑定任何具体客户端
  - Agent 的 streamFunction 字段（agent.ts:181）与 setDefaultStreamFn 注册表（stream-fn.ts:15）是两处注入点
  - streamProxy（proxy.ts:118）把 model/context/options POST 到代理服务器 /api/stream，由服务端管鉴权与供应商路由
  - 代理用 ProxyAssistantMessageEvent 把 partial 字段剥掉以省带宽，客户端在 processProxyEvent（proxy.ts:240）本地重建 partial
  - 因为发请求是接缝，换 StreamFn 就能让同一套 runLoop 走直连、走代理、甚至走本地模型，循环代码零改动
---

前几讲我们一直把"发给模型"当成一句 `streamFunction(...)`。这一讲正式揭开这个接缝：`StreamFn`。它是 pi 把"**怎么调用 LLM**"与"**怎么跑 agent 循环**"彻底解耦的关键设计。理解了它，你就明白为什么 pi 既能直连各家供应商，又能把请求全部转交给一个服务端代理。

## 一、StreamFn：一个被故意留空的口子

`StreamFn` 的类型定义其实不在 `stream-fn.ts`，而在 `packages/agent/src/types.ts:28`：

```ts
export type StreamFn = (
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
) => AssistantMessageEventStream | Promise<AssistantMessageEventStream>;
```

**一句话定义**：`StreamFn` 是"给定模型、上下文、选项，返回一条 `AssistantMessageEvent` 事件流"的函数。它只有一个契约（见 `types.ts` 上方注释）：**不许抛异常或用 rejected promise 表达失败**，所有错误必须编码进返回的流里——最终用一条 `stopReason: "error" | "aborted"` 的 `AssistantMessage` 收尾。

为什么这么设计？因为 `pi-agent-core` 的 `package.json`（`packages/agent/package.json:37`）只依赖 `pi-ai` 和 `pi-telemetry`，**不依赖任何客户端/服务器/协议包**。如果 `Agent` 直接 `import` 某个供应商 SDK，这层清洁就破了。把"发请求"抽成 `StreamFn`，core 包就只认接口、不认实现。

注入点有两处：

```ts
// agent.ts:181 —— 每个 Agent 实例自带一个
public streamFunction: StreamFn;

// stream-fn.ts:15 —— 全局默认注册表，调用方不传 streamFn 时用它
export function getDefaultStreamFn(): StreamFn {
	if (!defaultStreamFn) throw new Error("No default stream function configured. …");
	return defaultStreamFn;
}
export function setDefaultStreamFn(streamFn: StreamFn | undefined): void {
	defaultStreamFn = streamFn;     // 宿主可在启动时安装一个默认 runtime
}
```

`Agent` 构造时（`agent.ts:222`）优先用 `options.streamFn`，否则 `getDefaultStreamFn()`。这就是"core 不绑定客户端、却能被宿主装上默认客户端"的机制——`setDefaultStreamFn` 由更上层的宿主（如 coding-agent）调用，把具体模型运行时塞进来。

## 二、streamProxy：一个走服务端代理的实现

`proxy.ts` 的 `streamProxy`（`proxy.ts:118`）是 `StreamFn` 的标准范例：它**不直接调供应商，而是把请求转发给一个代理服务器**，由服务端管鉴权和路由。

```ts
export function streamProxy(model, context, options: ProxyStreamOptions): ProxyMessageEventStream {
	const stream = new ProxyMessageEventStream();     // 对外的事件流
	(async () => {
		const partial: AssistantMessage = { /* 初始化一个空壳 assistant 消息 */ };
		const response = await fetch(`${options.proxyUrl}/api/stream`, {   // ① POST 到代理
			method: "POST",
			headers: { Authorization: `Bearer ${options.authToken}`, "Content-Type": "application/json" },
			body: JSON.stringify({ model, context, options: buildProxyRequestOptions(options) }),
			signal: options.signal,
		});
		if (!response.ok) throw new Error(`Proxy error: ${response.status} …`);  // 注意：被外层 catch 收成 error 事件

		reader = response.body!.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		while (true) {                                 // ② 逐行读 SSE
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";
			for (const line of lines) {
				if (line.startsWith("data: ")) {
					const proxyEvent = JSON.parse(line.slice(6).trim()) as ProxyAssistantMessageEvent;
					const event = processProxyEvent(proxyEvent, partial);   // ③ 还原成本地事件
					if (event) stream.push(event);
				}
			}
		}
		stream.end();
	})();
	return stream;
}
```

三段流程：

1. **`fetch` 到 `{proxyUrl}/api/stream`**：把 `model`、`context`、`options` 整包 POST 出去。鉴权 token 在 header 里，所以**密钥只在客户端与代理之间**，代理再去对接各家供应商——这就是第 25–28 讲"信任边界"思想的雏形：敏感凭证不下放。
2. **读 SSE 流**：和 `pi-ai` 归一化后的事件流同构，只是来源从"供应商"换成"代理服务器"。
3. **`processProxyEvent` 重建 partial**：这是代理模式的精髓，下面展开。

## 三、partial 被剥掉又重建：带宽与解耦的权衡

代理服务器发下来的不是 `pi-ai` 原生事件，而是 `ProxyAssistantMessageEvent`（`proxy.ts:36`）。二者的关键差异：**代理事件把 `partial` 字段剥掉了**。

为什么剥？因为每条 `text_delta` 都带一份"截至目前的完整消息"会非常费带宽。代理只发增量（`text_delta: { contentIndex, delta }`），客户端本地用 `processProxyEvent`（`proxy.ts:240`）把增量攒回 `partial`：

```ts
case "text_delta": {
	const content = partial.content[proxyEvent.contentIndex];
	if (content?.type === "text") {
		content.text += proxyEvent.delta;        // 本地把增量拼回 partial
		return { type: "text_delta", contentIndex, delta: proxyEvent.delta, partial };
	}
}
case "toolcall_delta": {
	const content = partial.content[proxyEvent.contentIndex];
	if (content?.type === "toolCall") {
		(content as any).partialJson += proxyEvent.delta;
		content.arguments = parseStreamingJson((content as any).partialJson) || {};  // 边流边解析参数
		partial.content[proxyEvent.contentIndex] = { ...content };
		return { type: "toolcall_delta", contentIndex, delta: proxyEvent.delta, partial };
	}
}
```

于是：

- **线上省带宽**：传输的是 `delta` 增量，不是越来越长的 `partial` 快照。
- **客户端零损**：`processProxyEvent` 在本地把 `partial` 重建出来，下游 `runLoop` / TUI 拿到的是和直连完全一致的 `AssistantMessageEvent`。

> **知识拓展**：这正是第 14 讲"partial 是完整快照"的镜像设计。直连时 `pi-ai` 在客户端生成完整 `partial` 帮你看全貌；代理时因为带宽考虑，生成 `partial` 的责任从"发送方"转移到了"接收方"（proxy.ts 的 `processProxyEvent`）。同一个 `StreamFn` 契约，两种内部实现。

## 四、为什么"代理"是接缝而非特例

回到第 13–14 讲：`runLoop` 内层只写 `await streamFunction(config.model, llmContext, {...})`，它根本不知道 `streamFunction` 背后是直连还是代理。这意味着：

- 换一个 `StreamFn`，同一套 `runLoop` 就能**直连 Anthropic、走公司代理、甚至打本地模型**——循环代码一行不改。
- 代理可以**拦截/重定向整条工具流**：因为 `streamProxy` 完全掌控"请求发往哪、响应怎么解析"。若代理服务端想在 `toolCall` 阶段做审计、限流、或把某些工具调用重定向到内部服务，它只要在 `processProxyEvent` 的对应分支（`proxy.ts:312` 起的 `toolcall_*`）动手脚即可，客户端 `runLoop` 浑然不知。

> **一句话定义**：`streamProxy` 是一个"把 LLM 调用整体外包给服务端"的 `StreamFn` 实现。它把鉴权、供应商路由、带宽优化都收在代理侧，让 `pi-agent-core` 继续保持"零客户端依赖"的洁净，也顺手演示了 pi 信任边界（凭证不落地）的可插拔落地方式。

## 试一试

打开 `packages/agent/src`：

1. 看 `types.ts:28` 的 `StreamFn` 契约注释（`:22` 起）：为什么它要求"失败必须编码进流、不许抛异常"？如果某个 `StreamFn` 实现直接 `throw`，第 14 讲 `streamAssistantResponse` 的 `for await` 会怎样？
2. `proxy.ts:154` 的 `fetch` 把 `authToken` 放在 header。对比"前端直连供应商需要把 API key 打进 `getApiKey`"（`agent.ts:103`），两种方案的密钥暴露面有何不同？
3. 若你想让所有请求走本地 Ollama，只需要做什么？提示：写一个符合 `StreamFn` 签名的函数，在 `Agent` 构造时传进 `streamFn`，或在启动早期 `setDefaultStreamFn(...)`。

## 下一讲预告

`StreamFn` 管的是"怎么调模型"，而工具执行时还要"怎么跑命令、怎么读文件"——这同样是块可插拔的环境。下一讲看 `ExecutionEnv`（`harness/types.ts:315`）与它的 Node 实现 `NodeExecutionEnv`（`harness/env/nodejs.ts:347`）：为什么"执行环境"也要抽象成接口。
