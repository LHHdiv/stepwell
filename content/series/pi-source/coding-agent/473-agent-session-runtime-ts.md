---
title: "07 · agent-session-runtime.ts — 当前会话的夹具"
summary: "分清三件套，不要再把它们混成「创建一个 session」："
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/agent-session-runtime.ts`  
被谁调用：`main.ts` 里 `await createAgentSessionRuntime(createRuntime, { cwd, agentDir, sessionManager })`；之后三种 mode 都拿着返回的对象活。

## 本课目标

分清三件套，不要再把它们混成「创建一个 session」：

| 名字 | 干什么 | 会不会在换目录时重建 |
|---|---|---|
| `AgentSessionServices` | cwd 绑定的模型/设置/资源加载器 | 会 |
| `AgentSession` | 一次对话的产品对象（prompt、压缩、存盘） | 会 |
| `AgentSessionRuntime` | 把上面两个握在手里的夹具，带换轨方法 | **进程里长期是这一个** |

`main` 传入的 `createRuntime` 是闭包工厂。Runtime 换会话时**再调这个工厂**，所以 CLI 旗标（`--no-extensions`、额外 Skill 路径）换轨后仍然有效。

## 在系统中的位置

```text
main.ts
  const createRuntime = async ({ cwd, agentDir, sessionManager, ... }) => {
      services = createAgentSessionServices(...)     → 08 课
      created  = createAgentSessionFromServices(...) → 09 课
      return { session, services, diagnostics }
  }
  runtime = createAgentSessionRuntime(createRuntime, { cwd, agentDir, sessionManager })
  InteractiveMode(runtime) / runPrintMode(runtime) / runRpcMode(runtime)
```

## `createAgentSessionRuntime`（约 422 行）

```ts
export async function createAgentSessionRuntime(createRuntime, options): Promise<AgentSessionRuntime> {
	assertSessionCwdExists(options.sessionManager, options.cwd);
	const result = await createRuntime(options);
	return new AgentSessionRuntime(
		result.session,
		result.services,
		createRuntime,          // 存下来，换轨还要用
		result.diagnostics,
		result.modelFallbackMessage,
	);
}
```

**功能：** 第一次调用工厂，用结果 new 夹具。

**失败：** `assertSessionCwdExists` — 会话 JSONL 里记的工作目录已经没了，且调用方没给 fallback。`main` 在这之前已经处理过交互询问，正常不会走到抛错；RPC/print 没问过就会在更早 `exit(1)`。

工厂一旦返回，夹具认为「当前 session + services 是配套的」。后面 `switchSession` 必须先 `teardownCurrent` 再 `apply` 新结果，禁止服务还指向旧 cwd、session 已经是新文件。

## 类 `AgentSessionRuntime`

构造函数只存字段，不做 I/O。对外 getter：`session`、`services`、`cwd`（来自 services）、`diagnostics`、`modelFallbackMessage`。

### `setRebindSession` / `setBeforeSessionInvalidate`

mode 层在跑起来之后注册：

- `rebindSession`：新 session 就位后，重新 `bindExtensions`、重新 `subscribe` 事件。print-mode 里就是 `rebindSession` 那个闭包。
- `beforeSessionInvalidate`：旧 session 作废前同步拆 TUI 组件。必须同步：一旦 `await`，扩展上下文可能已经 stale，界面会指着已 dispose 的对象。

没有这两回调，换会话仍能换成新 `AgentSession`，但界面还订着旧对象的事件。

### 换轨的统一骨架

`switchSession` / `newSession` / `fork` 都是同一套：

1. 扩展钩子 `session_before_switch` 或 `session_before_fork`，可 `cancel`
2. `teardownCurrent`：
   - `session.abort()` 先把正在流的一轮停住并尽量写完 toolResult（注释写明：否则旧会话会丢半截回合）
   - 发 `session_shutdown`
   - `beforeSessionInvalidate?.()`
   - `session.dispose()`
3. `createRuntime({ 新的 sessionManager, cwd, sessionStartEvent })`
4. `apply(result)` 替换内部指针
5. `finishSessionReplacement`：调 `rebindSession`，再给调用方 `withSession` 钩子

`sessionStartEvent.reason` 会是 `"resume"` / `"new"` 等，扩展靠它区分「用户开了新聊天」还是「打开了旧文件」。

### `dispose`

进程退出（print-mode 的 `finally`）调它。拆当前 session，不创建下一个。

## 为什么 CLI 不直接拿着 `AgentSession`

因为交互里 `/resume`、换工作目录、fork 分支都要**换对象**。如果 InteractiveMode 把 `AgentSession` 闭包死，换轨后按键还打到旧 session。夹具提供稳定的 `runtime.session` 指针（其实每次 apply 后 getter 返回新引用，mode 必须 rebind）。

SDK 嵌入桌面时：若你只有一个 session、不换轨，可以只用 `createAgentSession()`，不必上 Runtime。Runtime 是「宿主要管理会话生命周期」时才需要的。

## 失败与边界

- 工厂在 teardown 之后失败：旧 session 已经 dispose，错误抛给调用方。`main` 初次创建失败会在 diagnostics 处 `exit(1)`；运行中途换轨失败由 mode 展示。
- `createRuntime` 闭包捕获了 `parsed`。所以 `--no-extensions` 在 `/resume` 之后仍然生效。这是刻意的：旗标是这次进程的政策，不是某条会话的属性。

## 下一课

工厂里第一句实质性工作：[08-agent-session-services.ts.md](/series/pi-source/coding-agent/474-agent-session-services-ts/)。
