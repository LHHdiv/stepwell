---
title: "09 · sdk.ts — 把 Agent、工具、提示焊成一次会话"
summary: "这是产品核心装配函数。读完应能从源码指出：模型从哪来、四件工具如何成为默认、streamFn 怎样接到 packages/ai、空的 Agent 如何被 AgentSession 包一层。文件后半的 export { createRea"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/sdk.ts`  
核心导出：`createAgentSession`  
被谁调用：`createAgentSessionFromServices`（CLI）；也可以被外部 `import { createAgentSession } from "@earendil-works/pi-coding-agent"`。

## 本课目标

这是产品核心装配函数。读完应能从源码指出：模型从哪来、四件工具如何成为默认、`streamFn` 怎样接到 `packages/ai`、空的 `Agent` 如何被 `AgentSession` 包一层。文件后半的 `export { createReadTool, ... }` 是给扩展作者用的，正课跟 CLI 路径可以后看。

文件头还有一句关键副作用：

```ts
setDefaultStreamFn(streamSimple);
```

`pi-agent-core` 的 `Agent` 允许不传 `streamFn`（旧编译的扩展）。默认必须指向 `pi-ai` 的 `streamSimple`。Agent 包自己不 import 厂家，保持可被非编程产品复用。coding-agent 作为产品，在加载本模块时把默认电话插上。

## 在系统中的位置

```text
createAgentSession(options)
  1. 解析 cwd / agentDir
  2. 准备 modelRuntime、settings、sessionManager、resourceLoader
  3. 从旧会话或设置选出 model、thinkingLevel
  4. 计算 initialActiveToolNames
  5. new Agent({ streamFn, convertToLlm, 钩子 })
  6. 把旧消息写回 agent.state
  7. new AgentSession({ agent, ... })   → 11 课
  8. return { session, extensionsResult, modelFallbackMessage }
```

CLI 路径里 1–2 步的对象已经由 08 课准备好，经 options 传入，不会再创建第二份。

## `createAgentSession` 逐步

### cwd / agentDir

```ts
const cwd = resolvePath(options.cwd ?? options.sessionManager?.getCwd() ?? process.cwd());
const agentDir = options.agentDir ? resolvePath(options.agentDir) : getDefaultAgentDir();
```

优先级：显式 cwd → 会话管理器记的 cwd → 进程 cwd。CLI 续写其它项目时，sessionManager.getCwd() 已经不是启动时的目录。

若调用方传了 `agentDir`，才据此拼 `auth.json` / `models.json` 给 ModelRuntime；否则 ModelRuntime.create 用自己的默认路径。CLI 总是把同一个 agentDir 传下来，避免测出来一份认证、跑起来读另一份。

### 会话是否「有历史」

```ts
const existingSession = sessionManager.buildSessionContext();
const hasExistingSession = existingSession.messages.length > 0;
```

`buildSessionContext` 从 JSONL 重建消息数组和最后一次模型记录。空文件或 `--no-session` 的内存会话长度为 0。

### 选模型

顺序是固定的，后面覆盖不了前面已经成功的选择：

1. `options.model`（CLI `--model` 已经在 `buildSessionOptions` 填好）
2. 否则若有历史：用历史里的 `provider/modelId`，且**当前仍有这家的认证**才恢复。认证没了就记下 `modelFallbackMessage`，继续往下找。
3. 否则 `findInitialModel`：设置里的默认 → 厂家默认。还没有可用模型则 fallback 文案变成「没有可用模型」（交互允许先进 TUI 再 `/login`；print 会在 main 里因此 exit）。

思考等级：options → 会话里的 thinking_level_change 条目 → 该模型的 per-model 设置 → 全局默认 → `clampThinkingLevel` 卡在模型能力范围内。没有模型则强制 `"off"`。

### 工具名

```ts
const defaultActiveToolNames = ["read", "bash", "edit", "write"];
const initialActiveToolNames = (
	options.tools ?? (options.noTools ? [] : (configuredDefaultToolNames ?? defaultActiveToolNames))
).filter(name => !excludedToolNameSet?.has(name));
```

- `options.tools`：白名单（`--tools`）
- `options.noTools`：`"all"` 或 `"builtin"` 时这里先变成 `[]`，扩展工具稍后由 AgentSession 再加
- 否则设置里的 `defaultTools`，再否则四件套
- `--exclude-tools` 最后过滤

真正的 `AgentTool` 实例不在本函数创建。Agent 初始 `tools: []`。AgentSession 构造时按这些名字去 `createReadTool` 等工厂拿实现，并叠上扩展工具。

### `convertToLlmWithBlockImages`

循环把 `AgentMessage[]` 交给模型前要变成厂家认识的 `Message[]`。默认 `convertToLlm` 在 `core/messages.ts`：滤掉 UI 专用的 custom 消息。

这里再包一层：若设置 `blockImages`，把所有 `type: "image"` 换成文本 `"Image reading is disabled."`，并去掉连续重复。**动态读设置**，所以会话中途改开关，下一轮就生效。这是防御，不是权限沙箱。

### `new Agent({...})` 里最重要的插线

`streamFn`：不直接把 `streamSimple` 塞进去，而包一层：

- 超时：设置里的 HTTP idle；`0` 不能真传 0（SDK 会当成 0ms 立即超时），改成 `2147483647`
- 重试次数、重试延迟来自设置
- `transformHeaders`：先合并归因头（哪个产品在调），再给扩展 `before_provider_headers`
- 真正打电话：`modelRuntime.streamSimple` → `packages/ai`

`onPayload` / `onResponse`：扩展在发请求前改 payload、在收到 HTTP 后看 status。没有 handler 时零成本返回。

`transformContext`：扩展在 convertToLlm **之前**改消息列表（注入、裁剪）。压缩不在这里，在 AgentSession 的 `prepareNextTurn` / `_checkCompaction`。

`sessionId`：来自 SessionManager，给支持 prompt cache 的厂家当稳定会话键。

`extensionRunnerRef`：此时 AgentSession 还没创建，扩展 runner 还不存在。用一个 `{ current?: ExtensionRunner }` 盒子，Session 构造后把 runner 填进去。streamFn 闭包读 `.current`，所以第一轮请求时已经是填好的。这是故意的时序：Agent 必须先于 Session 存在，Session 才能把它包起来。

### 把历史写回 / 给新会话打桩

有历史：`agent.state.messages = existingSession.messages`。若 JSONL 里从没记过思考等级，补一条 thinking_level_change，避免下次恢复读到 undefined。

无历史：立刻 `appendModelChange` + `appendThinkingLevelChange`。新会话文件一诞生就有「用的哪款模型」，`--continue` 才恢复得回来。

### `new AgentSession`

把 agent、三个 manager、cwd、工具名、resourceLoader、extensionRunnerRef 交进去。返回前取出 `extensionsResult` 给 UI（交互模式要知道加载失败了哪些扩展）。

## 失败与边界

本函数在「没有模型」时仍然返回 session，只带 `modelFallbackMessage`。**不在这里 throw。** 要不要允许无模型进入，是 `main` 按 appMode 决定的。SDK 调用方必须自己检查 `session.model`。

`setDefaultStreamFn` 是模块加载副作用。测试里若先 import sdk 再 import 裸 Agent，裸 Agent 也会打电话给 pi-ai。这是产品包的立场。

## 下一课

装配完成，CLI 把 runtime 交给皮。[10-print-mode.ts.md](/series/pi-source/coding-agent/476-print-mode-ts/) 是调试跟路径时最干净的一张皮：它如何 `session.prompt`。
