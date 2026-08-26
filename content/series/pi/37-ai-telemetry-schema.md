---
title: 第37讲·遥测契约：AI_TELEMETRY_SCHEMA 埋点
summary: pi 的"埋点"不是散落的 log，而是一份带 schema 的契约。本讲看 AI_TELEMETRY_SCHEMA 如何把可观测性做成类型安全的 span/event。
objectives:
  - 说出 AI_TELEMETRY_SCHEMA 是什么，它和第 11 讲"遥测即契约"的关系
  - 解释 startAiSpan / startHarnessSpan 这种"类型化 span 启动器"解决了什么
  - 把遥测埋点与第 36 讲写入安全、第 33 讲评测连成"质量三角"
tags: [pi, 遥测, telemetry, 可观测性]
keyPoints:
  - "AI_TELEMETRY_SCHEMA（harness/telemetry.ts:42）是 AI 相关埋点的结构化 schema，把'记什么'变成契约"
  - "startAiSpan（telemetry.ts:138）与 startHarnessSpan（:602）是类型化 span 启动器，确保每次埋点字段齐全、类型对"
  - "遥测是 span/event 而非日志：可聚合、可追踪、可在评测里当轨迹产物（呼应第 11/33 讲）"
  - "敏感字段用 sensitive?: boolean 标记（telemetry noop.ts:30），声明'这是敏感元信息'——但运行期是否脱敏由部署决定"
  - "telemetry 包提供 InMemoryTelemetryContext（memory.ts:192）与 NOOP_TELEMETRY_CONTEXT（noop.ts:20），方便测试与本机关闭"
---

第 11 讲我们定调：pi 的遥测是**契约**（spans/events），不是散落的 `console.log`。这一讲看那份契约长什么样——`AI_TELEMETRY_SCHEMA`，以及它怎么落地成类型安全的埋点。

## 一、先结论：埋点也有 schema

在 `packages/agent/src/harness/telemetry.ts:42`：

```ts
export const AI_TELEMETRY_SCHEMA = defineTelemetrySchema({ ... });  // 定义 AI 埋点的字段契约
```

`AI_TELEMETRY_SCHEMA` 是一份**结构化 schema**——它规定"一次 AI 调用该记哪些字段"：用了哪个模型、花了多少 token、延迟多少、是否命中缓存、出错码是什么……

注意它和第 11 讲的呼应：`telemetry` 包的 `defineTelemetrySchema`（`packages/telemetry/src/index.ts:72`）是通用"定义遥测 schema"的工具，而 `AI_TELEMETRY_SCHEMA` 是它在 AI 域的具体实例。**可观测性不是随便打点，而是先定义契约、再按契约填**。

## 二、类型化 span 启动器：别让埋点漏字段

光有 schema 不够——开发者容易"忘了记某个字段"或"记错类型"。pi 用**类型化 span 启动器**堵这个洞。看 `telemetry.ts`：

```ts
startAiSpan(...)   // :138 启动一次 AI 调用的 span
startHarnessSpan(...)  // :602 启动一次 harness 生命周期的 span
```

它们是 `createTypedSpanStarter`（`packages/telemetry/src/index.ts:349`）生成的——拿 schema 当模板，产出一个"只接受 schema 规定字段"的启动函数。你调 `startAiSpan` 时，TypeScript 会逼你把 schema 要求的字段填全、填对类型。于是"埋点漏字段"在编译期就被拦下，而不是上线后才发现数据残缺。

> **知识拓展**：这和思想里的 OpenTelemetry 同源——OTel 用 `Span` + 强 schema 定义遥测，而不是自由文本日志。pi 在内部用同一哲学，把"可观测性"当一等公民而非事后补救。

## 三、spans/events 而非日志：为何重要

第 33 讲评测里，`PI_SESSION_SNAPSHOT_ARTIFACT` 把轨迹当产物。遥测的 span 和它是同一套"结构化"思路：

- **日志**是给人看的字符串，难聚合、难检索；
- **span/event** 是带时间戳、带字段、可嵌套的结构，能直接进看板、能按模型/延迟/错误码聚合。

更妙的是，遥测 span 和评测轨迹**复用同一份结构化数据理念**——你跑评测时收集的轨迹，和线上排查用的 span，本就可以是同一种记录的两种视图。这就是第 11 讲说的"可观测性与日志解耦"的回报。

## 四、敏感字段：声明而非自动脱敏

pi 的遥测 schema 支持把某字段标为"sensitive"（`telemetry` 包的 `sensitive?: boolean`，见 `noop.ts:30`）：

```ts
{ sensitive?: boolean }   // 这只是'元数据声明'：'这是敏感信息'
```

要特别清醒：**`sensitive` 是个声明，不是运行期自动脱敏开关**。它告诉下游"这个字段敏感，你存/传之前要自己处理"。pi 不替你偷偷改数据，而是把"是否脱敏"这个决策**显式推给部署方**。这和第 25 讲的哲学一致——信任/安全是部署形态决定的，核心只做"如实声明"。

## 五、可关、可假的上下文

遥测还要"可关闭、可替换"，否则测试和本机开发会被拖垮。`telemetry` 包提供了：

- `InMemoryTelemetryContext`（`memory.ts:192`）：把 span 攒在内存里，测试时断言"这次调用记了几个 span"。
- `NOOP_TELEMETRY_CONTEXT`（`noop.ts:20`）：啥也不记的空实现，本机想关遥测时直接换上。

因为遥测是接口（`TelemetryContext.startSpan`，`index.ts:14`），换实现不影响业务代码。这正是"依赖倒置"——核心依赖抽象，具体 telemetry 后端随便插。

## 六、试一试

1. 在 `harness/telemetry.ts:42` 的 `AI_TELEMETRY_SCHEMA` 里看它定义了哪些字段（Hint：搜 `token` / `model` / `latency` / `error`），推断一次 AI span 能回答哪些排查问题。
2. 在 `telemetry/src/index.ts:349` 的 `createTypedSpanStarter` 里看它如何把 schema 变成"字段受限的启动函数"，理解类型安全从哪来。
3. 思考：如果把 `sensitive` 字段直接在前端脱敏（打码），会有什么隐患？为什么 pi 选择"只声明、不自动脱敏"？（提示：脱敏会丢失信息，且核心不该替部署做安全决策。）

## 下一讲预告

持久化与可观测性讲完，最后回到"产品总装"——`coding-agent` 如何把前面所有零件（agent 内核、tui、client、扩展、评测）拧成一个用户敲 `pi` 就能跑的命令行产品。下一讲看它自研的 CLI 参数解析。
