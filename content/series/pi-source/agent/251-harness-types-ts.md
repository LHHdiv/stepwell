---
title: "10 · harness/types.ts — Result、工具上下文、文件系统合同"
summary: "分清三套错误通道：Result（预期失败）、typed FileError/ExecutionError（环境）、throw（invariant）。再看 AgentHarnessTool.execute 比 AgentTool.exec"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/types.ts`  
被谁调用：harness 工具、`NodeExecutionEnv`、session JSONL（经 FileSystem）、公共 index re-export。

## 本课目标

分清三套错误通道：`Result`（预期失败）、typed `FileError`/`ExecutionError`（环境）、throw（invariant）。再看 `AgentHarnessTool.execute` 比 `AgentTool.execute` 多了什么。

## `Result` 四件套

`ok` / `err` / `getOrThrow` / `getOrUndefined`。`getOrUndefined` 限制 `TValue extends object`，防止 `0` / `""` 被当成失败。`toError` 把 unknown throw 收成 `Error`。

这和 `result.ts` 的 tagged error **不是** 同一层：`types.ts` 的 Result 给 FileSystem 这种「每次调用都可能失败」的环境；`result.ts` 给 lane 的业务错误（LaneBusy）。JSONL 的 `fileValue()` 把 File Result 转 throw，因为 Storage.commit 的合同是 throw = 整事务失败。

## `AgentHarnessTool`

`Omit<AgentTool, "execute">` 再写新的 execute：

```text
execute(
  toolCallId,
  params,
  onUpdate,          【同步，可带 { checkpoint: true }】
  toolContext,       【宿主注入，内置工具要 { env: ExecutionEnv }】
  invocation,        【invocationId = 预留的 result entry id；getMemo/setMemo】
  context,           【chord Context，带 abortSignal】
)
```

对比主链：loop 把 `signal` 和 `onUpdate` 传给 AgentTool；harness 把 abort 放进 `context.abortSignal`，把持久化进度放进 `onUpdate(..., { checkpoint: true })`。`invocation.setMemo` 是跨崩溃的小键值，给需要幂等的工具。

`AgentHarnessStreamOptions.deferred`：`true` 或 `{ window: "15m"|"1h"|"24h" }`。结构请求（压缩/导航摘要）强制关掉。

## Skill / PromptTemplate / Resources

Skill 按 agentskills.io：name、description、filePath 进系统提示 XML。`disableModelInvocation` 的技能仍可被 `lane.skill(name)` 显式调用。模板是 slash 展开，不进系统提示清单。

## FileSystem / Shell / ExecutionEnv

**不得 throw、不得 reject。** 失败必须 `err(FileError)`。路径不自动跟 symlink，要规范路径走 `canonicalPath`。`TextLineReader.readLine` 区分最后一行有没有 `\n`——JSONL 靠 `terminated === false` 发现撕行。

`FileErrorCode`：aborted / not_found / permission_denied / not_directory / is_directory / invalid / not_supported / unknown。Node 实现把 ENOENT 等映射过来。

`Shell.exec` 的输出不直接返回大字符串：走 `capture` + `onUpdate` 的 `ShellOutputUpdate`（replace / append / slide / metadata）。bash 工具再拼成给模型看的 text。

`ExecutionEnv extends FileSystem, Shell`。内置工具只依赖这个接口，所以测试可以假实现，生产用 `NodeExecutionEnv`。

`CompactionError` / `BranchSummaryError`：算法层 aborted / summarization_failed，同样不混进 lane 的 tagged error。

## 失败与边界

自己写 FileSystem 若 throw，JSONL `fileValue` 会变成「存储故障」→ harness fault。合同写在接口注释里，没有运行时检查。

## 下一课

[11 · config.ts](/series/pi-source/agent/252-harness-config-ts/) 是构造期校验。环境实现见 [78 · nodejs.ts](/series/pi-source/agent/319-harness-env-nodejs-ts/)。
