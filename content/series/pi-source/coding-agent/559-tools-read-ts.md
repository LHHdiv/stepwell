---
title: "52 · tools/read.ts — 读文件"
summary: "constrainedSampling: { type: \"jsonschema\", strict: \"prefer\" }。 系统提示 snippet：Read file contents；guideline：用 read 而不是 ca"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/read.ts`  
被谁调用：`createAllToolDefinitions`；AgentSession 默认激活。

## schema

TypeBox：

- `path` string：相对或绝对
- `offset` 可选 number：1-indexed 起始行
- `limit` 可选 number：最多行数

`constrainedSampling: { type: "json_schema", strict: "prefer" }`。  
系统提示 snippet：`Read file contents`；guideline：用 read 而不是 cat/sed。

## execute 副作用

**无写盘。** `resolveReadPathAsync`（macOS 截图名变体）→ `ops.access`（R_OK）→ 探测 MIME。

- 图片：读 Buffer，`processImage` 默认缩 2000×2000，content 为 text 说明 + `ImageContent`。当前模型 `input` 不含 image 时加一句「图会被省略」。处理失败只返回文本错误，不 throw 到 loop 以外。
- 文本：UTF-8 全读进内存，再按 offset/limit 切片，然后 `truncateHead`。

`operations` 可换成远程读。abort：监听 signal，reject `Operation aborted`。

## 截断

默认 `truncateHead`：2000 行或 50KB，先到先停，**不拆行**。

| 情况 | 给模型的文本 |
|---|---|
| 首行就超过 50KB | 空内容 + 建议 `sed \| head -c` |
| 行数/字节截断 | 正文 + `Use offset=N to continue` |
| 用户 limit 提前结束 | `M more lines … offset=` |
| offset 超出文件 | throw（变成 tool 错误结果） |

`details.truncation` 给 TUI，不进厂家 API（厂家只看到 content 文本）。

## 和 executeToolCalls 的关系

1. loop 从 assistant 取出 `toolCall` name=`read`
2. `prepareToolCall` 用本 schema 校验；失败则 **不 execute**，错误 toolResult 回模型
3. `beforeToolCall` 扩展可 block
4. `execute` 读盘；throw 被 coding-agent/agent-core 包成 `isError` 结果（wrapper 不 catch，core 会）
5. 并行：多个 read 可同时进行；与 write 同文件无队列（read 不进 mutation queue）——并行批里 write 同时 read 可能读到旧/新，取决于调度

length 截断的半个 path：**不执行**，避免读错文件。

## 下一课

[53-tools-write.ts.md](/series/pi-source/coding-agent/561-tools-write-ts/)。
