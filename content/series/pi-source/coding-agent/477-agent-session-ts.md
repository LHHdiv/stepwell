---
title: "11 · agent-session.ts — 产品会话与 prompt"
summary: "能指着 prompt 说出：斜杠命令如何被截胡、流式中途的句子如何排队、没模型/没登录如何在发 HTTP 之前失败、用户消息如何变成 Agent.prompt 的入参。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/agent-session.ts`（一千行以上）  
本课只精读：**这个类在系统里干什么**，以及 **`prompt()` 从进到把消息交给 `Agent` 的路径**。压缩、fork、slash 命令、模型切换是同一文件后半，执行链第一次走到时再开专课，避免一篇里把三条河讲完。

## 本课目标

能指着 `prompt` 说出：斜杠命令如何被截胡、流式中途的句子如何排队、没模型/没登录如何在发 HTTP 之前失败、用户消息如何变成 `Agent.prompt` 的入参。

## 在系统中的位置

文件头英文原意：所有运行模式共用的核心抽象。封装 Agent 状态访问、带自动存盘的事件订阅、模型与思考等级、压缩、bash、会话切换与分支。Mode 在这之上只做 I/O。

```text
runPrintMode / InteractiveMode
  session.prompt(text, { images, streamingBehavior })
    扩展命令 / Skill / 模板
    鉴权
    必要时压缩
    组装 user AgentMessage
    _runAgentPrompt → agent.prompt(...)     → packages/agent
    SessionManager 在事件回调里写 JSONL
```

`sdk.ts` 里 `new AgentSession({ agent, sessionManager, ... })` 之后，Agent 已经存在但 `tools: []`、`systemPrompt: ""`。构造函数里才会装工具、拼系统提示、创建 ExtensionRunner，并把 runner 填进 `extensionRunnerRef.current`。

## 构造时发生的事（读 prompt 之前必须知道）

打开 class 正文（搜 `export class AgentSession`）往下看构造函数，按职责记，不必一次背全字段：

1. 保存 `agent`、三个 manager、cwd、`modelRuntime`。
2. 用 `initialActiveToolNames` 创建内置工具实例（`createReadTool` 等），再叠 `customTools` 和扩展工具，设到 `agent.state.tools`。
3. `resourceLoader` 取出 Skill、上下文文件、系统提示覆盖，调用 `buildSystemPrompt`，写入 `_baseSystemPrompt` 和 `agent.state.systemPrompt`。
4. `new ExtensionRunner`，绑定到 agent 的 beforeToolCall/afterToolCall 等钩子。
5. `agent.subscribe`：**持久化**。每次 `message_end`、tool 结果、模型切换，转成 JSONL 条目。这就是「会话自动保存」的实现位置，不在 prompt 函数里显式 write。
6. 若有 `sessionStartEvent`，通知扩展「会话开始了」。

所以：`prompt` 跑到一半崩溃，已经 `message_end` 的部分仍可能已经在磁盘上。这是事件驱动存盘，不是函数末尾才 commit。

## `prompt(text, options?)` 逐步（约 1175 行）

签名人话：发一句用户文本。options 可带图片、是否展开模板、流式时排队策略、输入来源（给扩展看是键盘还是 RPC）。

### A. 斜杠命令

```ts
if (expandPromptTemplates && text.startsWith("/")) {
	const handled = await this._tryExecuteExtensionCommand(text);
	if (handled) { preflightResult?.(true); return; }
}
```

`/login`、扩展注册的 `/foo` 在这里执行。扩展自己决定要不要再调模型。**内核 slash**（`/model`、`/compact`）不走这一支，由交互 mode 的命令表处理，print 模式几乎碰不到。`expandPromptTemplates: false` 时（RPC 已展开过）跳过。

`_tryExecuteExtensionCommand`：按第一个空格切开命令名和参数，问 runner `getCommand`。没有就返回 false，这句话当普通 prompt 继续（用户打了 `/不是命令`）。

### B. 压缩进行中禁止提交

`_compactionAbortController` 有值说明正在压缩。再 prompt 会把两套模型调用搅在一起。throw，让 UI 提示等一等。

### C. 扩展拦截输入

`_runInputHandlers` 发 `input` 事件。扩展可改写文本/图片，或吞掉（返回空则 prompt 直接成功返回，不调模型）。Skill 展开**之前**拦截，才能看到用户原始的 `/skill:x`。

### D. Skill 与提示模板

```ts
expandedText = this._expandSkillCommand(expandedText);
expandedText = expandPromptTemplate(expandedText, [...this.promptTemplates]);
```

`/skill:名字 args` 变成「请按该 SKILL.md 的说明做，参数是 args」，真正的说明书在系统提示的 skills 清单里，模型稍后用 read 去读文件。模板是 slash 展开成一段固定 prompt。

### E. 已经在流式输出

```ts
if (this.isStreaming) {
	if (!options?.streamingBehavior) throw new Error("Specify streamingBehavior ...");
	steer 或 followUp 排队;
	return;
}
```

交互里你在模型还在打字时回车：mode 必须声明这句是 **steer**（当前轮结束后插进去再问）还是 **followUp**（等 Agent 本会停下来再开一轮）。print 模式 await 整轮，不会进这里。

steer/followUp 的队列在 `packages/agent` 的 `Agent` 上。本层只是把文本变成 `AgentMessage` 再 `agent.steer` / `agent.followUp`。

### F. 发请求前的硬校验

- 没有 `this.model`：throw，文案来自 `formatNoModelSelectedMessage`
- 这家没有配置好的认证：OAuth 失效给 `/login` 提示；API key 缺失给另一套文案

**这两步失败不会产生用户消息条目**（还没组装 messages）。这就是 print 模式没登录时立刻返回 1、JSONL 仍是空会话的原因。

### G. 压缩检查

若上一条是助手消息，`_checkCompaction`。窗口将满或上次被 length 截断，可能先调模型写摘要再继续。细节归压缩课。这里只要知道：**压缩发生在用户消息进循环之前**，会额外消耗一轮模型调用。

### H. 组装 messages

```ts
messages = [{ role: "user", content: [文本, ...图片], timestamp }];
加上 _pendingNextTurnMessages;
扩展 before_agent_start 可能再塞 custom 消息、改 systemPrompt;
```

`custom` 角色不会被 `convertToLlm` 送给模型（除非扩展另有转换），给 UI 显示用。系统提示若被扩展改写，只对这一轮：下一轮没有 override 就回到 `_baseSystemPrompt`。

### I. `_runAgentPrompt(messages)`

内部会 `await this.agent.prompt(messages)`（或等价的多消息入口）。从这里离开本包，进入 [agent/01-agent.ts.md](/series/pi-source/agent/242-agent-ts/)。

`preflightResult(true)` 在调用 agent 之前：RPC 用它区分「请求被拒绝」和「模型已经在跑」。json 模式的客户端可以先画「已接受」。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 扩展命令处理了 | return，不调模型 |
| 扩展吞掉输入 | return，算成功 |
| 正在压缩 | throw |
| 流式未声明排队策略 | throw |
| 没模型/没登录 | throw，无新 JSONL 用户条 |
| agent 循环 error | 事件里 assistant stopReason=error，订阅器仍可能写盘 |

不要在 prompt 里找 `appendFile`。写盘在构造时挂上的 `agent.subscribe`。

## 下一课

离开 coding-agent，进入运行时包：[agent/00-模块导读.md](/series/pi-source/agent/241-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)，然后 [agent/01-agent.ts.md](/series/pi-source/agent/242-agent-ts/)。
