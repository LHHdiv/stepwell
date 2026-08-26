---
title: 附录A·命令速查与源码锚点
summary: 一页纸速记 pi 的 CLI 开关、ExtensionAPI 方法与全系列高频引用的 file:line 锚点，临场查阅用。
objectives:
  - 快速定位本系列高频引用的源码锚点
  - 速记 pi 的关键 CLI 开关与 ExtensionAPI 方法
tags: [pi, 速查, 附录, 锚点]
keyPoints:
  - "CLI 关键开关：--no-builtin-tools（cli/args.ts:35/:121）、模式由 AppMode（project-trust.ts:12）决定"
  - "ExtensionAPI 方法：registerTool(:1251)/registerCommand/registerShortcut/registerFlag/registerProvider（types.ts:1198）"
  - "运行时锚点：Agent(agent.ts:173)、runLoop(agent-loop.ts:155)、executeToolCalls(:411)、AgentHarness(:305)"
  - "线协议锚点：encodeClientMessage(codec.ts:79)、framing(:28/:58)、ClientMessage(schemas.ts:397)"
  - "本附录是'导航索引'，配合 45 讲毕业项目直接使用"
---

本附录把全系列高频引用的**源码锚点**与**命令面**收成一页，写代码或回想细节时直接查。

## 一、CLI 开关速记

| 开关 / 概念 | 位置 | 作用 |
|---|---|---|
| `--no-builtin-tools` | `cli/args.ts:35` / `:121`，`main.ts:538` | 关闭出厂内置工具，只留 customTools + 扩展 |
| 运行模式 | `project-trust.ts:12` 的 `AppMode` | interactive / print / rpc，由 `Args` 决定 |
| 扩展 flag | `main.ts:857` 摊平 `extension.flags` | 扩展经 `registerFlag` 注入的启动参数 |

## 二、ExtensionAPI 方法速记

定义在 `core/extensions/types.ts:1198`，工厂签名在 `:1519`：

| 方法 | 注入什么 | 见讲次 |
|---|---|---|
| `registerTool(tool)` | 一个工具（`:1251`，`defineTool` 在 `:509`） | 19–20 |
| `registerCommand(cmd)` | 一个斜杠命令 | 21 |
| `registerShortcut(sc)` | 一个快捷键 | 21, 31 |
| `registerFlag(flag)` | 一个 CLI 参数 | 21, 38 |
| `registerProvider(p)` | 一个 LLM 供应商 | 21, 40 |
| `registerMarkdownComponent(...)` | markdown 渲染组件 | 21, 30 |
| `on(event, handler)` | 订阅生命周期事件 | 21 |

## 三、源码锚点索引（按包）

**pi-agent-core**（`packages/agent/src`）
- `agent.ts:173` `class Agent`；`:61` `MutableAgentState`；`:486` `runWithLifecycle`；`:544` `processEvents`
- `agent-loop.ts:155` `runLoop`；`:281` `streamAssistantResponse`；`:411` `executeToolCalls`；`:433` 顺序；`:489` 并发；`:607` `prepareToolCall`
- `harness/agent-harness.ts:305` `AgentHarness`；`harness/session/state.ts:50` `SessionState`；`reducer.ts:506` `reduceLaneState`；`harness/messages.ts:124` `convertToLlm`
- `harness/session/types.ts:361` `SessionRepo`；`harness/telemetry.ts:42` `AI_TELEMETRY_SCHEMA`、`:138` `startAiSpan`、`:602` `startHarnessSpan`

**pi-ai**（`packages/ai/src`）
- `types.ts:455` `Message`；`:415` `AssistantMessage`；`:360` `ToolCall`；`:523` `AssistantMessageEvent`；`:794` `Model`
- `models.ts:97` `Provider<TApi>`；`:254` `ModelsImpl`；`:762` `createProvider`；`providers/anthropic.ts:43`；`providers/all.ts:89`
- `models-store.ts:27` `InMemoryModelsStore`；`env-api-keys.ts:31` `ANTHROPIC_API_KEY_ENV`

**pi-protocol**（`packages/protocol/src`）
- `codec.ts:79` `encodeClientMessage`、`:84` `encodeServerMessage`；`cbor/encoder.ts:211`、`decoder.ts:161`
- `framing.ts:28` `encodeFrame`、`:58` `FrameDecoder`；`schemas.ts:3` `PROTOCOL_VERSION`、`:397` `ClientMessage`、`:440` `ServerMessage`、`:193` `TranscriptItem`、`:241` `SessionSnapshot`

**pi-telemetry**（`packages/telemetry/src`）
- `index.ts:14` `startSpan`、`:72` `defineTelemetrySchema`、`:349` `createTypedSpanStarter`；`memory.ts:192` `InMemoryTelemetryContext`；`noop.ts:20` `NOOP`、`:30` `sensitive?`

**pi-server / pi-client**
- `server/src/server.ts:42` `listeners`、`:82`/`:97` `listener.start → accept`
- `client/src/unix.ts:12` unix 传输工厂、`:23` `connectUnixSocket`、`:32` `createConnection`

**pi-tui**（`packages/tui/src`）
- `tui.ts:2`/`:248` 差分渲染主类；`:339` `renderRequested`、`:341` `renderTimer`、`:812` 合并调度

**pi-coding-agent**（`packages/coding-agent/src`）
- `core/extensions/types.ts:509` `defineTool`、`:447` `ToolDefinition`、`:1198` `ExtensionAPI`、`:1251` `registerTool`、`:1519` `ExtensionFactory`
- `core/extensions/loader.ts:689` `discoverAndLoadExtensions`、`:436` `loadExtensionModule`、`:174–242` `bindCore`、`:50–74` `VIRTUAL_MODULES`、`:264` `registerTool` 实现
- `core/session-manager.ts:855` `SessionManager`、`:1638` `list`、`:1653` `listAll`
- `core/agent-session.ts:305` `AgentSession`、`:908` `getAllTools`、`:928` `setActiveToolsByName`、`:1116` `prompt`、`:208`/`:383` `customTools`
- `main.ts:11` `parseArgs` 导入、`:156`/`:609` 调用、`:857` 扩展 flags；`cli/args.ts:35`/`:121` flag 定义
- `modes/interactive/interactive-mode.ts:1012` `run`、`:1094` `while(true)`；`print-mode.ts:33` `runPrintMode`
- `core/sdk.ts:73`/`:383` `customTools`；`core/project-trust.ts:12` `AppMode`

**pi-evals**（`packages/evals/src`）
- `pi-harness.ts:25` 导入 `vitest-evals/harness`、`:28` `PiCodingAgentInput`、`:90` `promptAgent`、`:109` `runPiCodingAgent`、`:246` `createPiCodingAgentHarness`；`vitest-evals/harness-table.ts:157` `evalHarnessTable`

**AGENTS.md（开发纪律）**
- `:27` 勿手改 `models.generated.ts`；`:58` 只显式暂存；`:128` 锁步版本

> 用法：写作/调试时，按"包 → 文件:行"直接跳转。每个锚点都来自本系列正文，可回对应讲次看上下文。
