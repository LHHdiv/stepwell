---
title: 第32讲·事件驱动更新：从流到屏
summary: agent 吐出的 AssistantMessageEvent 不只是给模型看的内部结构，也是 TUI 的"刷新信号"。本讲闭环：事件如何驱动组件实时更新。
objectives:
  - 说出 agent 事件流如何被 TUI 消费并转化为组件状态更新
  - 解释为什么"事件即刷新信号"和第 29 讲差分渲染天然契合
  - 把本讲与第 06 讲事件流、第 29-31 讲渲染/输入连成完整 TUI 闭环
tags: [pi, tui, 事件驱动, 流式]
keyPoints:
  - "agent 运行时产出的 AssistantMessageEvent（第 06 讲）同时被 TUI 订阅，作为界面刷新信号"
  - "TUI 的事件处理器只做两件事：更新对应组件的状态 + 置 renderRequested（tui.ts:339）请求渲染"
  - "状态更新与绘制解耦：事件密也不怕，第 29 讲的 setTimeout 合并保证每帧只 flush 一次"
  - "工具调用事件驱动'工具卡片'组件出现；text delta 事件驱动'回复区'组件增长——各组件各管一摊"
  - "整条链路：模型 token → 第 06 讲事件 → 本讲状态更新 → 第 29 讲差分写屏，完成'边想边动'"
---

前面几讲我们分别看了：第 06 讲 agent 吐出 `AssistantMessageEvent`；第 29 讲 TUI 差分写屏；第 30 讲组件与布局；第 31 讲键位输入。这一讲把它们**拧成闭环**——那串事件，到底怎么让界面"活"起来。

## 一、先结论：事件是 TUI 的"刷新信号"

`AssistantMessageEvent` 不只是给上层逻辑用的内部消息，**它也是 TUI 的刷新信号**。当 agent 流式产出事件，coding-agent 把这些事件同时喂给两路：

- 一路进 agent 运行时（更新对话上下文、决定要不要调工具）；
- 一路进 TUI（更新界面状态）。

同一个事件，两个消费者。这是典型的多播：事件生产一次，多方各取所需。

## 二、TUI 的事件处理器：只更新状态

TUI 拿到事件后，处理器极简——看 `packages/tui/src/tui.ts:339` 的 `renderRequested` 标志如何被置位：

```ts
// 伪代码：TUI 订阅 agent 事件
onEvent((event) => {
	switch (event.type) {
		case "text":
			messageComponent.append(event.text);   // 更新"回复区"组件状态
			break;
		case "toolcall":
			toolCardComponent.add(event.toolCall);  // "工具卡片"组件出现
			break;
		case "done":
			statusBarComponent.set("idle");
			break;
	}
	requestRender();   // 置 renderRequested = true（tui.ts:339）
});
```

注意：处理器**不画屏**，只改组件状态 + 请求渲染。`requestRender` 就是第 29 讲那个合并调度——把"渲染"推迟到下一个 tick 合并执行。

## 三、每个组件各管一摊

事件类型天然映射到组件：

| 事件（第 06 讲） | 驱动哪个组件 | 界面表现 |
|---|---|---|
| `text` delta | 消息区/回复组件 | 回复文字逐字增长 |
| `thinking` delta | 思考区组件 | "正在思考…"逐字出现 |
| `toolcall` | 工具卡片组件 | 出现一个"调用中"的工具块 |
| `tool_result` | 工具卡片组件 | 工具块显示结果 |
| `done` / `error` | 状态栏组件 | 状态从"生成中"变"空闲" |

因为组件是纯函数式的（第 30 讲），"状态更新"就是换一组输入，下一次 `render` 自然产出新字符串行。再交给第 29 讲的差分比较，只把变化的部分写回终端。

## 四、为什么这套设计抗"事件风暴"

流式对话里，一个回复可能产出成百上千个 `text` delta 事件。如果每事件都直接写屏，终端会卡死。但本讲的设计让"事件风暴"无害：

- **事件处理极轻**：只改内存里的组件状态（一次数组 push），不碰终端；
- **渲染被合并**：第 29 讲 `setTimeout(0)` 把一帧内的所有 `requestRender` 合并成一次 flush；
- **差分只写增量**：flush 时只把"回复区最后变了的那几字符"写出去。

于是"1000 个事件"≈"每 16ms 一次差分写屏"。这正是 pi 在廉价终端上也能丝滑流式的原因。

## 五、完整闭环

把所有讲次拼起来，一次"模型回复"的界面旅程是：

```
LLM 吐 token
  → pi-ai 归一为 AssistantMessageEvent（第 06 讲）
  → agent 运行时消费 + TUI 订阅（本讲）
  → TUI 更新组件状态、requestRender（tui.ts:339）
  → 第 29 讲调度合并 + 差分写屏
  → 用户看到回复逐字出现
  → 用户按键（第 31 讲）→ 输入框组件更新 → 同样走渲染调度
```

模型、运行时、界面，被"事件"这一条主线串成单向数据流。**没有双向纠缠、没有命令式乱画**——这正是现代 UI 架构（React/Vue 的响应式）在终端里的回响。

## 六、试一试

1. 在 `tui.ts` 里搜 `onEvent` 或 `subscribe` 或 `emit`，看 TUI 是在哪"接上" agent 事件流的（Hint：可能在 coding-agent 的 main 里把 session 事件转发给 TUI）。
2. 假设你想让"工具调用"时播放一段动画——基于"事件→组件→渲染"模型，你该改哪一层？是改事件、改组件、还是改渲染？
3. 思考：如果事件处理器里直接 `console.log`，会破坏差分渲染吗？为什么（提示：绕过了组件状态）？

## 下一讲预告

界面会动了，但"一个 agent 到底好不好用"得有客观标尺。下一讲看 pi 的质量门禁：用 `vitest-evals` 把 agent 跑成可打分轨迹，给"毕业"一个硬指标。
