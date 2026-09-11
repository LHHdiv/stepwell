---
title: "03 · pi-harness.ts — 把 AgentSession 适配成 vitest-evals Harness"
summary: "这是 evals 的焊点，对应 coding-agent 的 createAgentSessionFromServices。读完应能指出：临时目录怎么拆、扩展为何必须一开始为空、JSONL 何时快照、失败时 cleanup 如何聚合成 "
tags: [pi, evals]
---
源码：`packages/evals/src/pi-harness.ts`  
核心导出：`createPiCodingAgentHarness`、`resolveModelSelection`  
被谁调用：三份 `*.eval.ts`。

## 本课目标

这是 evals 的焊点，对应 coding-agent 的 `createAgentSessionFromServices`。读完应能指出：临时目录怎么拆、扩展为何必须一开始为空、JSONL 何时快照、失败时 cleanup 如何聚合成 AggregateError。

## 在系统中的位置

```text
createHarness({ name, run: ({ input, signal, setArtifact }) => runPiCodingAgent(...) })
  mkdtemp(tmpdir()/pi-eval-)
    workspace/  +  agent/  +  sessions/
  createAgentSessionServices({ cwd, agentDir, modelRuntime, SettingsManager.inMemory() })
  SessionManager.create(cwd, join(root, "sessions"))
  createAgentSessionFromServices({ model, thinkingLevel: "off", tools, noTools, customTools })
  可选 transformSystemPrompt → session.reload()
  for step of input: prompt | reload
  setArtifact(runId, sessionId)
  finally: 读 JSONL → setArtifact(piSessionJsonl); session.dispose(); rm(root)
```

`thinkingLevel: "off"`：评测要可复现，关掉思考预算。

## `resolveModelSelection`

显式 `{ provider, id }` 优先，否则 env。trim。缺任一抛固定文案。单元测试只覆盖这个函数（`test/pi-harness.test.ts`），不启动 Agent。

## `toTranscriptEvents`

把 `AgentSession.messages` 收成 vitest-evals 的 `TranscriptEvent[]`：user/assistant 文本、assistant 上的 toolCall、toolResult（错则带 error）。`toolCalls(result.session)` 这类 helper 吃的是这份 events，不是 Pi 内部类型。

custom 消息（UI 专用）被跳过。

## `promptAgent`

记 prompt 前的 message 长度，`session.prompt(input)`，从新增消息里倒着找最后一条 assistant。`stopReason` 必须是 `stop` 或 `toolUse`。纯 stop 还要求 `getLastAssistantText()` 非空。abort 在外层 listener 里 `session.abort()`。

## `runPiCodingAgent` 的隔离不变量

```ts
if (evalSession.extensionRunner.getExtensionPaths().length !== 0) {
  throw new Error("Expected an isolated eval session to start without extensions.");
}
```

临时 cwd / agentDir 是空的，不应加载到用户本机 `~/.pi` 扩展。若这条炸了，说明 services 的路径解析把全局目录漏进来了——评测会污染、也不可复现。

`transformSystemPrompt`：先创建 session（拿到 default prompt），变换，空字符串拒绝，再 `reload()` 让运行时吃新提示。resourceLoader 的 `systemPromptOverride` 读闭包里的 `transformedSystemPrompt`，第一次 create 时它还是 undefined，所以必须 reload。

`SettingsManager.inMemory()`：不写用户 settings.json。

模型：`ModelRuntime.create()` 无参，认证走默认 agent 目录。临时 `agentDir` 只隔离 skills/extensions/session 文件。

usage：从 `getSessionStats()` 填 tokens；若模型价目有非零费率才附 `estimatedCostUsd`。cache token 放 metadata。

## 清理顺序

无论成功失败：

1. 若 session 文件存在，读进 artifact（失败进 cleanupErrors，不掩盖主错误）
2. `session.dispose()`
3. `rm(root, { recursive, force: true })`

主错误 + cleanup 错误 → AggregateError。成功但 cleanup 失败 → 仍 throw cleanup（评测结果不能假装干净）。成功路径把 `timings.totalMs` 用 `performance.now()` 差值附上。

`signal`：一开始和每步前 `throwIfAborted`；prompt 期间 abort → `session.abort()`。临时目录仍删。

## `createPiCodingAgentHarness` 重载

有 `output` 回调则 `Harness<Input, TOutput>`，否则 output 是 string（最后一次 prompt 的 assistant 文本）。`name` 默认 `"pi-coding-agent"`。比较实验必须给不同 name。

输入：`string` 或 `{type:"prompt", content} | {type:"reload"}` 数组。全是 reload 会 throw「至少一次 prompt」。

## 失败与边界

- 不设 `cwd` 到仓库根，模型就算有 bash 工具也碰不到你的真实项目；docs.eval 把文档绝对路径写进 prompt，并白名单 read/grep/find/ls。
- 快照发生在 `rm` 之前。dispose 是否再写一行 JSONL 取决于 SessionManager；读的是 getSessionFile() 当时磁盘内容。
- 本适配器不注入 TelemetryContext。span 不是 eval 的度量来源；token/cost 来自会话统计。

## 下一课

每条测试结束后如何把 JSONL 挂到 vitest task：[04-vitest-evals.setup.ts.md](/series/pi-source/evals/729-vitest-evals-setup-ts/)。
