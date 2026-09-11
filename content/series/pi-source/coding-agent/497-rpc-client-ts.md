---
title: "21 · rpc-client.ts — 给宿主用的 RPC 客户端"
summary: "看客户端如何把「方法调用」映射成 JSONL，以及事件和 response 如何分流。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/rpc/rpc-client.ts`  
被谁调用：SDK 用户 `new RpcClient({ cwd, model }).start()`；本仓库测试。  
**不**被 `main` 调用。它是另一台进程里的皮。

## 本课目标

看客户端如何把「方法调用」映射成 JSONL，以及事件和 response 如何分流。

## 在系统中的位置

```text
宿主
  RpcClient.start()
    spawn("node", [cliPath, "--mode", "rpc", ...])
    attachJsonlLineReader(child.stdout)
  RpcClient.prompt("hi")
    stdin.write({ type:"prompt", id:"req_1", message:"hi" })
    等 type==="response" && id==="req_1"
  onEvent / waitForIdle / collectEvents
    其它 JSON 行当 JsonAgentSessionEvent
```

## `start` / `stop`

默认 `cliPath = "dist/cli.js"`，相对**宿主 cwd**。测试要自己指到打包文件。

stdio 全是 pipe。stderr 拼进 `this.stderr` 并原样转发到宿主 stderr，方便排错。

启动后 `setTimeout(100ms)` 再看 `exitCode`。子进程若立刻因缺模块挂掉，100ms 内能发现。这不是握手：RPC 没有 greeting 帧。竞态下 100ms 不够，第一次 `send` 会在 stdin 错误里爆。

`stop`：停 reader，SIGTERM，1 秒后 SIGKILL。

## `send` 与 pending map

每个命令生成 `req_${++requestId}`，放进 `pendingRequests`。30 秒超时。`handleLine` 见到 `type==="response"` 且 id 命中，resolve 后**不再**当事件分发。

其它行（事件、extension_ui_request、无 id 的 response）全部丢给 `eventListeners`。客户端**没有**内建的 extension UI 应答。要用扩展对话框，宿主得自己 `onEvent` 里认 `extension_ui_request` 再往 stdin 写 `extension_ui_response`。当前 `send` 类型是 `RpcCommandBody`，不含 UI response——宿主需要的话得直接写 stdin 或扩展本类。

进程 exit / spawn error / stdin error：`rejectPendingRequests`。之后的 `send` 立刻 throw `exitError`。

## 高层方法

`prompt` 只等 response，不等 `agent_settled`。注释写明用 `waitForIdle()` 或 `promptAndWait()`。`waitForIdle` 订一次 `agent_settled`，默认 60s。`collectEvents` 把中间所有事件收进数组。

`getData`：`success: false` 抛 `Error(error)`；true 则 `as T`。类型安全靠「每个 public 方法知道自己的 command」，运行时不校验 data 形状。

## 失败与边界

- `JSON.parse` 失败的行被忽略。子进程若打了非 JSON 的 banner，会静默丢。这就是 rpc-entry 要吞 `emitWarning` 的原因。
- 没有自动重连。
- `getAvailableModels` 把返回值标成 `ModelInfo[]`（provider/id/contextWindow/reasoning），实际服务端给的是完整 `Model[]`。多出来的字段还在，类型窄了。

## 下一课

交互皮开始：[22-tui-renderer.ts.md](/series/pi-source/coding-agent/499-tui-renderer-ts/)。
