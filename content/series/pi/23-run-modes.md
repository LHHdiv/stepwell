---
title: 第23讲·三种运行模式
summary: 一个 AgentSession，三种 IO 通道：interactive 陪你聊天、print 跑完即走、rpc 当服务被调。本讲看清模式分派与 AppMode。
objectives:
  - 说出 interactive / print / rpc 三种模式的适用场景与入口函数
  - 指出模式切换发生在哪一层（AppMode 类型定义处）
  - 把"一种内核、三种外壳"和第 04 讲"动手跑起来"连起来
tags: [pi, 运行模式, interactive, print, rpc]
keyPoints:
  - "interactive 模式：InteractiveMode.run（interactive-mode.ts:1012）里 while(true) 不断 getUserInput 再 session.prompt（:1094），是人机对话主循环"
  - "print 模式：runPrintMode（print-mode.ts:33）一次性把输入喂给 session 跑完即退出，适合脚本/CI"
  - "rpc 模式：modes/rpc/ 下把 AgentSession 暴露为可被外部程序调用的服务"
  - "AppMode 类型（project-trust.ts:12 一带）决定走哪条分支；核心都是同一个 AgentSession，只是 IO 通道不同"
  - "三模式共享第 14-18 讲的运行时内核，差异只在'输入从哪来、输出到哪去'"
---

第 04 讲我们跑起 pi 时，其实已经选了一种"姿态"：要么是交互式终端，要么是一次性脚本。但 pi 的内核只有一套——`AgentSession`。本讲回答：同一个内核，怎么长出三种完全不同的使用姿势？

## 一、先结论：一种内核，三种外壳

无论哪种模式，背后都是第 39 讲要深读的 `AgentSession`。区别只在**输入从哪来、输出到哪去**：

| 模式 | 入口 | 输入来源 | 生命周期 | 典型场景 |
|---|---|---|---|---|
| interactive | `InteractiveMode.run` | 终端键盘 | 长驻，等用户 | 日常编程助手 |
| print | `runPrintMode` | 命令行参数 | 跑完即退出 | 脚本、CI、批处理 |
| rpc | `modes/rpc/` | 外部进程/网络 | 服务型常驻 | 被 IDE、上层系统调用 |

`AppMode` 这个类型（定义在 `packages/coding-agent/src/core/project-trust.ts:12` 一带）就是模式的总开关——它在启动早期决定 pi 走哪条分支。

## 二、interactive：人机共舞的主循环

`InteractiveMode` 是最"重"的模式。看 `packages/coding-agent/src/modes/interactive/interactive-mode.ts:1012`：

```ts
async run() {
	// ...初始化 TUI、加载会话...
	while (true) {                       // —— 一直等你 ——
		const input = await getUserInput();   // 从终端读一行/一段
		await session.prompt(input);          // 交给 AgentSession 跑一轮
	}
}
```

核心就是 `:1094` 那句 `while (true) { getUserInput; session.prompt }`——**它把"读取人类输入"和"驱动 agent"串成一个永不停的循环**。你每敲一段，就触发一次第 02 讲描述的"对话生命线"：输入 → 模型流式回复 → 工具调用 → 结果回灌 → 再回复，直到模型安静下来，循环回到"等你输入"。

> **知识拓展**：这种"read-eval-print loop（REPL）"结构在所有交互式程序里都能见到（Node REPL、Python 解释器、数据库命令行）。pi 的特别之处在于，循环中间的 `eval` 不是执行代码，而是"驱动一个会调用工具的智能体"。

## 三、print：跑完即走

`print-mode.ts:33` 的 `runPrintMode` 走的是另一条路：没有 `while(true)`，没有 TUI，把命令行给的输入一次性喂给 `session.prompt`，等它跑完直接退出。

```ts
export async function runPrintMode(session, input) {
	await session.prompt(input);   // 跑一轮
	// 结束，进程退出
}
```

它和第 02 讲"一次对话的生命线"是同一套内核，只是把"人类在循环里反复输入"压扁成了"一次性输入"。这让它天然适合**脚本化、可复现**的任务：CI 里让 pi 自动修 lint、生成 changelog，都不需要人守着。

## 四、rpc：当服务被调用

`packages/coding-agent/src/modes/rpc/` 下的实现更进一步：它不自己读键盘，也不自己退出，而是把 `AgentSession` 包成一个**可被外部程序调用的服务**。上游（IDE 插件、你自己的编排脚本）通过某种传输（通常就是第 25–28 讲要讲的 client/server 协议）发来"请做 X"，pi 在 rpc 模式下接收、驱动内核、回传结果。

这引出一个重要视角：**pi 既能当"人用的工具"，也能当"机器用的工具"**。当 rpc 模式配合第 27 讲的瘦客户端，pi 就成了一个可被任意程序编排的"智能体微服务"。

## 五、差异只在 IO，内核不变

把三种模式合起来看，结论是干净的：**它们共享第 14–18 讲的运行时（runLoop、工具执行、harness），唯一变量是 IO 通道**。这正是"关注点分离"的教科书式体现——内核不必知道"谁在跟我说话"，它只管"给定输入，产出回复"。

`AppMode` 在启动期做完这个"选通道"的决策后，内核就一视同仁地运转。这也解释了为什么第 04 讲你换一种启动方式，体验天差地别，但底层跑的是同一套代码。

## 六、试一试

1. 在 `main.ts` 里搜索 `AppMode` 的分派点，看它是根据哪个参数（`--mode`？`--print`？还是环境变量？）决定走 interactive / print / rpc 的。
2. 打开 `modes/rpc/`，数一数它暴露了哪些"可被远程调用"的方法，和第 02 讲"对话生命线"的哪个阶段对应。
3. 思考：如果要在 print 模式下强行用 TUI 渲染，会出什么问题？从"输出通道已定"的角度解释。

## 下一讲预告

三种模式让 pi 能"以不同姿态运行"，但每次运行都该留下痕迹——会话要能存、能读、能分叉。下一讲走进 `SessionManager`，看 pi 如何把一次次的对话持久化，并支持"分支"这种时间旅行式的能力。
