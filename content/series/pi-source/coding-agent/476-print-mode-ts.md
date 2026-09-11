---
title: "10 · print-mode.ts — 单次跑完就退出的皮"
summary: "看一张没有 TUI 的皮如何使用 Runtime。交互模式多了几百个组件，但调用 prompt 的方式和这里一样。跟执行路径用 -p，就是走本文件。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/print-mode.ts`  
被谁调用：`main.ts` 在 `appMode` 为 print/json 时 `runPrintMode(runtime, { mode, messages, initialMessage, initialImages })`。

## 本课目标

看一张**没有 TUI** 的皮如何使用 Runtime。交互模式多了几百个组件，但调用 `prompt` 的方式和这里一样。跟执行路径用 `-p`，就是走本文件。

## 在系统中的位置

```text
main 决定 print
  runPrintMode(runtime, options)
    rebindSession()           绑定扩展 + 订阅事件
    session.prompt(第一句)
    session.prompt(后续每句)
    text 模式：把最后一条助手文本打到 stdout
    json 模式：每个事件一行 JSON（订阅时已经写了）
    finally disposeRuntime()
```

文件头英文：single-shot；`pi -p "prompt"` 出文本；`pi --mode json` 出事件流。

## `runPrintMode`

返回 `Promise<number>`：0 成功，1 失败。`main` 把它写进 `process.exitCode`，然后 `restoreStdout`。不在这里 `process.exit`，好让 stdout 排空。

### 信号

注册 `SIGTERM`，非 Windows 再加 `SIGHUP`。触发时杀掉跟踪过的游离子进程（bash 工具可能 `nohup` 过），dispose runtime，按信号惯例退出码 143/129。`SIGINT`（Ctrl+C）没在这里注册：print 模式走 Node 默认，或由更外层处理。不要假设和交互模式相同。

### `rebindSession`

1. `session.bindExtensions({ mode: "print" | "json", commandContextActions })`  
   扩展需要「新开会话、fork、切会话」时，动作转到 `runtimeHost.newSession/fork/switchSession`。print 一次进程通常用不到，但扩展 API 必须齐全，否则扩展一调这些方法就炸。
2. `session.subscribe`：json 模式把每个事件 `JSON.stringify` 写 stdout；text 模式这里**不订输出**（避免流式把半截字打上去，最后再打一遍）。
3. json 模式额外订 `agent.subscribe` 做 stdout 背压：事件太快会撑爆管道。

`runtimeHost.setRebindSession(rebindSession)`：若 prompt 过程中扩展触发了换会话，Runtime 换完会再调这里，订阅绑到新 session。

### 发提示

```ts
if (initialMessage) {
	await session.prompt(initialMessage, { images: initialImages });
}
for (const message of messages) {
	await session.prompt(message);
}
```

`initialMessage` 来自 `prepareInitialMessage`（管道、`-p` 后的字符串、`@file`）。`messages` 是其它位置参数。每一句都 **await 整轮循环结束** 再发下一句。这和交互里边流边 steer 不同：print 是串行、同步语义。

没有 initialMessage 也没有 messages：不 prompt，text 模式可能什么都不打（最后一条不是助手）。`pi -p` 空跑仍会创建 runtime，这是浪费但合法。

### text 输出

循环全部结束后，看 `session.state.messages` 最后一条。若是 assistant：

- `stopReason` 为 `error` / `aborted`：stderr 打错误，exitCode=1
- 否则把 content 里所有 `type: "text"` 块写出。工具调用的 JSON、thinking 块**不**出现在 text 模式的最终输出里。用户只看到人话。

json 模式不走这段：事件已经在订阅里写过，包括 tool_execution_*、text_delta。

### `finally`

撤信号处理器，`runtimeHost.dispose()`，`flushRawStdout()`。管道对端很慢时必须等 flush，否则截断最后几行。

## 失败与边界

`prompt` throw（没模型、没认证、压缩冲突）进 `catch`，stderr 打 message，返回 1。不会留下半开的 runtime：finally 总会 dispose。

`takeOverStdout` 在 `main` 进入 print 前就发生了。本文件用 `writeRawStdout` 而不是 `console.log`，避开被劫持的 console。读到「为什么不用 console.log」时回到 `core/output-guard.ts`。

## 下一课

所有皮最终都进 [11-agent-session.ts.md](/series/pi-source/coding-agent/477-agent-session-ts/) 的 `prompt`。
