---
title: 第01讲·全景地图：十一个包的依赖分层
summary: 按依赖方向把 11 个包分成七层，讲清"地基不认识天花板"的分层纪律，并给出一条按依赖顺序的学习路线。
objectives:
  - 画出 pi 的七层依赖图，并说清每层负责什么
  - 解释为什么 pi-ai 只类型层依赖 telemetry、agent-core 不依赖 client/server
  - 记住本系列讲序 = 依赖顺序这条铁律
tags: [pi, 架构, 依赖分层]
keyPoints:
  - 七层：基础库（telemetry/ai/protocol）→ 运行时核心（agent-core）→ 传输层（server/client）→ 终端 UI（tui）→ 产品装配（coding-agent）→ 持久化（session-backends）→ 质量门禁（evals）
  - pi-ai 仅类型层 import telemetry（ai/src/types.ts:1）；agent-core 依赖 ai+telemetry 但不依赖 client/server/protocol
  - client 只依赖 protocol（client/package.json:50）；server 依赖 ai+protocol；tui 零 pi 依赖（通用库）
  - 分层纪律让"换 UI / 换传输 / 换持久化后端"互不影响，是大型 TS 项目的正面案例
---

上一讲我们画出"五道缺口"的藏宝图。这一讲把藏宝图落到真实的目录结构上：打开 `packages/`，你会看到 11 个包。它们不是平铺的，而是按依赖方向分成了七层。理解这七层，后面 45 讲你永远不会迷路。

## 一、七层依赖图

pi 的依赖方向是**单向向下**的——上层认识下层，下层绝不认识上层。这是它最值得学的工程纪律。完整图谱如下（箭头表示"依赖"）：

```
┌──────────────────────────────────────────────────────────────┐
│ ⑦ 质量门禁   pi-evals          （vitest-evals 轨迹打分）        │
├──────────────────────────────────────────────────────────────┤
│ ⑥ 持久化     session-backends/sqlite-node + storage            │
│             （SQLite 会话仓库：分支/泳道/事实/租约）            │
├──────────────────────────────────────────────────────────────┤
│ ⑤ 产品装配   pi-coding-agent    （CLI + 扩展 + 三模式）         │
├──────────────────────────────────────────────────────────────┤
│ ④ 终端 UI    pi-tui             （差分渲染，零 pi 依赖）         │
├──────────────────────────────────────────────────────────────┤
│ ③ 传输层     pi-server（受信任大脑）  pi-client（瘦控制器）      │
├──────────────────────────────────────────────────────────────┤
│ ② 运行时核心 pi-agent-core      （Agent + 主循环 + 工具 + 状态） │
├──────────────────────────────────────────────────────────────┤
│ ① 基础库     pi-ai  │  pi-telemetry  │  pi-protocol            │
└──────────────────────────────────────────────────────────────┘
```

逐层说明（每层都对应前面"缺口表"里的一行）：

| 层 | 包 | 负责的器官 | 关键文件 |
|---|---|---|---|
| ① 基础库 | `pi-ai` | "怎么跟模型说话" | `ai/src/models.ts:97` `Provider<TApi>` |
| ① 基础库 | `pi-telemetry` | 可观测性契约 | `telemetry/src/index.ts:14` `TelemetryContext` |
| ① 基础库 | `pi-protocol` | 线格式（CBOR） | `protocol/src/codec.ts:79` `encodeClientMessage` |
| ② 运行时核心 | `pi-agent-core` | 心脏：Agent + 主循环 | `agent/src/agent-loop.ts:155` `runLoop` |
| ③ 传输层 | `pi-server` | 受信任大脑（持 Key） | `server/src/server.ts:39` `PiServer` |
| ③ 传输层 | `pi-client` | 瘦控制器 | `client/src/client.ts:51` `PiClient` |
| ④ 终端 UI | `pi-tui` | 差分渲染屏幕 | `tui/src/tui.ts:23` `Component` |
| ⑤ 产品装配 | `pi-coding-agent` | 把零件粘成 CLI | `coding-agent/src/cli.ts:21` `main()` |
| ⑥ 持久化 | `session-backends` | 会话仓库 | `session-backends/sqlite-node/src/sqlite/index.ts:2` `SqliteSessionRepository` |
| ⑦ 质量门禁 | `pi-evals` | 轨迹评测 | `evals/src/pi-harness.ts:250` `createPiCodingAgentHarness` |

## 二、三条最关键的依赖事实（用源码验证）

光看目录会误判，必须用 `package.json` 的依赖字段和 `import` 语句坐实。三条事实最重要：

**事实一：pi-ai 只"类型层"依赖 telemetry。** 在 `packages/ai/src/types.ts:1` 你看到的是 `import type { TelemetryContext }`——`import type` 意味着编译后这行消失，运行时 ai 根本不加载 telemetry 的任何代码，只是借用它的类型来给 `telemetryContext?: TelemetryContext` 做签名（`types.ts:122-123`）。所以 telemetry 是"契约库"，不是"运行时库"。

**事实二：agent-core 不依赖传输层。** `packages/agent` 的 `harness/telemetry.ts:1-13` 是类型导入，`src/index.ts:37-42` 却在**运行时** re-export 了 `createTypedSpanStarter` 等——说明 agent-core 真正用到了 telemetry 的运行时。但它**从不** `import` `pi-client` / `pi-server` / `pi-protocol`：Agent 不知道自己会被本地直接驱动，还是被远程 client 通过 socket 驱动。这是"运行时核心与传输解耦"的硬证据。

**事实三：client 是 protocol 的"唯一 pi 亲属"，tui 是孤儿。** `client/package.json:50` 显示 client 只依赖 `@earendil-works/pi-protocol`；`server/package.json:50-51` 依赖 `pi-ai` + `pi-protocol`；而 `tui` 的 `package.json:47-50` 只有 `get-east-asian-width` 和 `marked` 两个第三方包——对整个 `pi-*` 命名空间零 import（已用 grep 验证）。**tui 是个完全通用的终端渲染库**，理论上能拿去渲染任何 CLI 应用，不只是 pi。

> **知识拓展：为什么"地基不认识天花板"是好事？**
> 这叫**依赖倒置 / 分层清洁**。坏味道是：底层（如 agent-core）反向 import 顶层（如 coding-agent 的 UI），形成循环依赖，改一处崩全局。pi 的做法是：agent-core 只认 ai 和 telemetry，至于"谁来调用它、用不用 socket、屏幕长啥样"，它一概不知。于是你可以①把 CLI 换成网页（不改 agent-core）；②把 socket 换成 stdio（不改 agent-core）；③换 SQLite 为远程仓库（不改 agent-core）。可替换性 = 分层清洁的红利。dsh 同样讲究分层，但 pi 把"传输层独立成 client/server 两个包"做得更彻底——这直接服务于它"把大脑放服务端"的信任设计（第 25 讲）。

## 三、本系列讲序 = 依赖顺序

记住一条铁律：**讲序 = 依赖顺序 = 数据流动顺序**。我们从最底下的基础库读起，沿着依赖箭头往上，最后才到产品装配。原因很简单——读 `coding-agent` 时你会不断撞见 `Agent`、`Model`、`SessionHandle`，这些都在下层；如果倒着读，每读一行都要向前跳三章。

具体路线（也是本系列九卷的顺序）：

1. 先读基础库：第 05–11 讲（Message 类型、流式、Provider、CBOR、快照 DTO、遥测契约）；
2. 再读心脏：第 12–18 讲（Agent、runLoop、工具派发、StreamFn、ExecutionEnv、harness）；
3. 然后手脚：第 19–24 讲（工具注册、内置工具、ExtensionAPI、加载器、三模式、会话管理）；
4. 接着信任边界：第 25–28 讲（client/server 为何分进程、Unix socket）；
5. 终端 UI：第 29–33 讲（差分渲染、组件、键位、事件映射、评测）；
6. 持久化与可观测性：第 34–37 讲（SQLite 仓库、分支/泳道、租约、span 埋点）；
7. 最后产品总装：第 38–45 讲（CLI、AgentSession、SDK 复用、测试、毕业）。

## 试一试

在你的本地 pi 副本里做三件核对，把"依赖图"变成你亲眼见过的东西：

1. 打开 `packages/ai/package.json`，确认 `dependencies` 里**没有** `@earendil-works/pi-agent-core` 或 `pi-client`——证明"基础库不向下依赖产品层"；
2. 用 `grep -rn "@earendil-works/pi-client" packages/agent/src/` 搜一下，预期**零结果**——坐实"运行时核心不认识传输层"；
3. 打开 `packages/tui/package.json`，数一数 `dependencies` 里 `@earendil-works/*` 的数量，预期为 **0**——确认 tui 是通用库。

## 下一讲预告

地图有了。下一讲我们顺着依赖图最关键的"心脏"路径，追踪**一次对话的完整生命线**：从你在终端敲下提示词，到 `AgentSession.prompt()` 唤醒 `Agent`，再到 `runLoop` 的双层 while、模型流式响应、工具派发、回到下一轮——把整条数据流在源码里走一遍。
