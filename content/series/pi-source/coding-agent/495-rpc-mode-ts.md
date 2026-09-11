---
title: "20 · rpc-mode.ts — 无头 JSONL 皮"
summary: "对照 10-print-mode.ts.md。print 是「发完提示就退」；RPC 是「进程当服务器」。调用 session.prompt 的方式和 print 一样，只是提示来自 JSON 命令而不是 argv。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/rpc/rpc-mode.ts`  
被谁调用：`main` 在 `appMode === "rpc"` 时 `runRpcMode(runtime)`。返回 `Promise<never>`：要么一直听 stdin，要么 `process.exit`。

## 本课目标

对照 [10-print-mode.ts.md](/series/pi-source/coding-agent/476-print-mode-ts/)。print 是「发完提示就退」；RPC 是「进程当服务器」。调用 `session.prompt` 的方式和 print 一样，只是提示来自 JSON 命令而不是 argv。

## 在系统中的位置

```text
main 决定 rpc
  runRpcMode(runtime)
    takeOverStdout()
    rebindSession()          绑定扩展 UI + 订阅事件
    attachJsonlLineReader(stdin)
      handleInputLine
        extension_ui_response → 解开 pending Promise
        RpcCommand → handleCommand → session.* / runtimeHost.*
    事件：toJsonEvent → writeRawStdout
```

## 启动

`takeOverStdout()`：和 print 一样，劫持 console，协议走 `writeRawStdout`。否则 `console.log` 会插进 JSONL。

`runtimeHost.setRebindSession(rebindSession)`：fork / new_session / switch_session 换了 `AgentSession` 之后，订阅必须绑到新对象。

## `rebindSession`

1. `session.bindExtensions({ mode: "rpc", uiContext: createExtensionUIContext(), commandContextActions, shutdownHandler })`。
2. `session.subscribe`：每个事件 `output(toJsonEvent(event))`；`agent_settled` 时检查扩展是否请求了 shutdown。
3. `session.agent.subscribe`：只为 `waitForRawStdoutBackpressure()`。事件太快会撑爆管道。

扩展 UI 的 `select/confirm/input/editor` 用 `createDialogPromise`：生成 UUID，把 request 写 stdout，等 stdin 上对应 `extension_ui_response`。`signal` abort 或 `timeout` 则返回默认值（select → undefined，confirm → false）。`notify`/`setStatus`/`setWidget`/`setTitle`/`setEditorText` 只输出、不等待。

RPC 明确不支持：`onTerminalInput`、working indicator、custom 组件工厂、theme 切换、`getEditorText`（同步方法等不了往返，恒返回 `""`）。宿主若需要编辑器内容，自己在本地跟踪 `set_editor_text`。

## `handleCommand` 和 prompt 的时序

`prompt` **不**在 handleCommand 里 await 整轮循环：

```ts
void session.prompt(..., {
  source: "rpc",
  preflightResult: (didSucceed) => {
    if (didSucceed) output(success(id, "prompt"));
  },
}).catch(e => { if (!preflightSucceeded) output(error(id, "prompt", e.message)); });
return undefined; // 先不写 response
```

preflight 成功（通过扩展 `input` 钩子、队列或立即开跑）才发 `success`。这样客户端 `prompt()` Promise 在「已经收下」时就 resolve，真正的 token 流走 event。preflight 失败（没模型等）走 error response。

`steer` / `follow_up` / `abort` 是 await 后立刻 success。它们本身就是入队/取消，不是整轮循环。

换会话类命令（`new_session`、`switch_session`、`fork`、`clone`）成功且未 cancelled 时 `await rebindSession()`。

`bash` 先 `emitUserBash` 给扩展拦截；有 `result` 就 `recordBashResult`，否则 `session.executeBash`。和交互模式同一条扩展钩子。

未知 `type`：`error(..., "Unknown command: ...")`。

## 生命周期

- SIGTERM / SIGHUP：杀跟踪过的游离子进程，`shutdown(143/129)`。
- stdin `end`：正常 shutdown 0。
- 扩展 `shutdownHandler`：设 `shutdownRequested`，等下一次 `agent_settled` 或命令处理完再退。正在跑的 prompt 不会被立刻砍掉。
- `shuttingDown` 防重入。SIGTERM 时**不** `flushRawStdout`（对端可能已经没了）；其它路径会 flush。

`return new Promise(() => {})` 让函数的 Promise 永不 resolve，配合 `Promise<never>`。真正退出靠 `process.exit`。

## 失败与边界

- 解析失败的行：`command: "parse"`，没有 id。
- 命令 throw：用该命令的 id/type 回 error，进程继续。
- 和 print 一样不注册 SIGINT。Ctrl+C 在 RPC 场景通常是宿主的事。
- stdout 背压只在「写完一条 response」和 agent 事件订阅里等待。扩展 UI request 的 `output()` 不等背压——假设对话框不多。

## 下一课

[21-rpc-client.ts.md](/series/pi-source/coding-agent/497-rpc-client-ts/) — 宿主侧如何 spawn 并对上 id。
