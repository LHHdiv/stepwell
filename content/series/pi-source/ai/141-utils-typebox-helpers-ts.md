---
title: "80 · utils/typebox-helpers.ts — Google 吃得下的 string enum"
summary: "TypeBox 默认 enum 可能变成 anyOf+const，Gemini 的 JSON Schema 子集不喜欢。StringEnum([\"add\",\"subtract\"], { description, default }) 生"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/typebox-helpers.ts`  
被谁调用：工具 schema 作者；主入口导出。

TypeBox 默认 enum 可能变成 `anyOf`+`const`，Gemini 的 JSON Schema 子集不喜欢。`StringEnum(["add","subtract"], { description, default })` 生成 `{ type: "string", enum: [...] }`。

`TUnsafe<T[number]>` 让 `Static<typeof schema>` 仍是字面量联合。

没有下一课在本包（除 `providers/`）。厂家工厂、`data/*.json`、生成脚本由另一份课表覆盖。执行链回到 agent-loop 时，工具 `execute` 在 `packages/coding-agent/src/core/tools/`。
