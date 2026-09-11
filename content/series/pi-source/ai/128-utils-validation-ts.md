---
title: "67 · utils/validation.ts — 执行工具前把 LLM JSON 变成合法参数"
summary: "模型常把数字写成字符串、把缺省字段填 null。本文件：normalizeOptionalNulls 去掉可选 null → Value.Convert → 若不是 TypeBox Kind 再 coerceWithJsonSchema"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/validation.ts`  
被谁调用：agent-loop 的 `prepareToolCall`（coding-agent 包一层）。本包导出给扩展也能用。

## 本课目标

模型常把数字写成字符串、把缺省字段填 `null`。本文件：`normalizeOptionalNulls` 去掉可选 null → `Value.Convert` → 若不是 TypeBox Kind 再 `coerceWithJsonSchema`（`"true"`→boolean 等）→ `Compile` 校验。失败 throw 带路径和收到的 JSON，模型下一轮能改。

`validateToolCall` 先按名找 tool，找不到 throw `Tool "x" not found`。`validateToolArguments` 假定已经找到。

validator 缓存在 `WeakMap`（按 schema 对象身份）。

## 失败与边界

额外 properties：看 schema `additionalProperties`。未知工具不是本文件的「校验失败」而是 not found——Agent 都变成 isError toolResult。`structuredClone` 参数，不改消息上的原始 arguments。

## 下一课

半截 JSON：[68-utils-json-parse.ts.md](/series/pi-source/ai/129-utils-json-parse-ts/)。
