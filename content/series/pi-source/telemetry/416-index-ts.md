---
title: "01 · index.ts — 观测契约和 typed schema"
summary: "读完应能指出：为什么没有 end()、schema 为什么运行时不校验、typed starter 如何把父 span 绑成子 starter。"
tags: [pi, telemetry]
---
源码：`packages/telemetry/src/index.ts`  
核心导出：`TelemetryContext`、`TelemetrySpan`、`defineTelemetrySchema`、`createTypedSpanStarter`  
被谁调用：agent harness 的 `telemetry.ts` / `context.ts`；pi-ai 的请求 options 类型；本包其它文件从这里拿类型。

## 本课目标

分清两层 API：

1. **开放层**（adapter 实现）：`startSpan({ name, attributes }, callback)`，名字和属性是自由字符串袋。
2. **封闭层**（域包用）：schema 对象推出「这个 span 只能带这些 start 属性、这些 event」。

读完应能指出：为什么没有 `end()`、schema 为什么运行时不校验、typed starter 如何把父 span 绑成子 starter。

## 在系统中的位置

```text
应用 / 测试
  new InMemoryTelemetryContext() | 自己的 OTel adapter | 不传 → NOOP
       ↓ TelemetryContext
  agent-core getTelemetryContext(ctx)
       ↓ createTypedSpanStarter(ctx, AGENT_TELEMETRY_SCHEMAS)
  startAiSpan("pi.ai.request", { ... }, async (span, startChild) => { ... })
       ↓ 运行时只是 context.startSpan({ name, attributes }, ...)
  adapter 记一条 span
```

本文件前半是开放层类型，后半是 schema 类型体操 + 一个极薄的 runtime 函数。

## 开放层：Context / Span

```ts
export interface TelemetryContext {
  startSpan<T>(options: SpanOptions, callback: (span: TelemetrySpan) => T | Promise<T>): Promise<T>;
}

export interface TelemetrySpan extends TelemetryContext {
  addEvent(name: string, attributes?: SpanAttributes): void;
  setAttributes(attributes: SpanAttributes): void;
  setStatus(status: SpanStatus): void;
}
```

`TelemetrySpan extends TelemetryContext`：子 span 的父就是当前 span。没有 TLS、没有 `getCurrentSpan()`。pi 代码一律把 span 当参数往下传。adapter 内部可以激活 OTel 的 ambient context，那是 adapter 的私事。

`SpanAttributes` 的值只允许 `string | number | boolean` 及其只读数组。这是安全边界：prompt、工具输出、HTTP header 进不了类型。`undefined` 表示「这个键这次不写」，合并时忽略。

`SpanStatus` 是判别联合：`{ status: "ok" }` 或 `{ status: "error"; error?: { name, message } }`。error 细节可选，因为 Error 对象本身可能不可读（见 conformance 的 Proxy 用例）。

`startSpan` 的返回永远是 `Promise<T>`。同步 callback 也包成 Promise：这样同步 throw 变成 rejected Promise，调用方统一 `await`。这是契约，noop 和 memory 都必须遵守。

## `defineTelemetrySchema`

```ts
export function defineTelemetrySchema<const T extends TelemetrySchemaDefinition>(schema: T): T {
  return schema;
}
```

typed identity。`const T` 把字面量钉死，`values: ["stream", "fetch_deferred", ...]` 不会放宽成 `string[]`。运行时原样返回，**不做** parent 检查、**不做** required 检查。校验发生在 TypeScript，以及你们自己的测试。

一份 schema 的形状：

- `version: number`
- `spans[name]`：`description`、`parents`、`startAttributes`、`endAttributes`、可选 `events`、`status: { default: "ok", errorWhen: string }`

`parents` 只是文档：`any` / `root_or_external` / `{ kind: "spans", spans: [...] }`。adapter 看不到这份对象。

属性元数据：`sensitive`、`cardinality`、`values`（标量闭集）、`elementValues`（数组元素闭集）。start / event 属性有 `required: boolean`；end 属性**没有** required——它们是完成期 enrichment，可以一次都不 `setAttributes`。

## 推断类型怎么走

`AttributeDefinitionValue` 按 `type` + 可选闭集推出值类型。然后：

- `InferStartAttributes`：required 键必填，其它可选
- `InferOptionalAttributes`：end 属性全部可选
- `ExactTelemetryAttributes<Expected, Actual>`：多出来的键类型是 `never`，用来拒绝未知 key

`SchemaTelemetrySpan` 把开放层的 `addEvent` / `setAttributes` 换成只接受本 span 声明过的名字。`startSpan` 本身仍在 `TelemetrySpan` 上（开放），typed 路径用的是下面的 starter。

## `createTypedSpanStarter`

```ts
export function createTypedSpanStarter<const Schemas extends TelemetrySchemaTuple>(
  telemetryContext: TelemetryContext,
  _schemas: Schemas & UniqueTelemetrySchemas<Schemas>,
): TypedSpanStarter<Schemas>
```

第二个参数叫 `_schemas`：运行时不用。只为了：

1. 把多个 schema 的 span 名合成 overload 交集（`UnionToIntersection`）
2. `UniqueTelemetrySchemas` 在字面量重复时把类型变成 `{ "duplicate telemetry span names": ... }`，调用处编译失败

`bindTypedSpanStarter` 是真正的 runtime：

```ts
telemetryContext.startSpan({ name, attributes }, (span) =>
  callback(span as SchemaTelemetrySpan, bindTypedSpanStarter(span)),
);
```

注意：子 starter 绑的是 **callback 收到的 span**，不是外层 context。嵌套调用的 parent 关系因此自动正确。把 span 强转成 schema 视图——运行时仍然是同一个对象，`addEvent("undeclared")` 在 JS 里能跑，只是 TS 拦。

多 schema 数组必须 `as const`（或直接内联）。分开声明的 `const schemas = [A, B]` 会丢 tuple，overload 塌成宽类型。

## 失败与边界

- 本文件没有任何校验函数。坏名字、缺 required、错类型，adapter 照收。域包要靠 TS + 测试。
- `createTypedSpanStarter` 不读 schema 内容，所以传一份「撒谎」的 schema 不会在运行时报错。
- 开放层允许任意 `name`。typed 层只是调用约定，拦不住手写 `context.startSpan({ name: "typo" })`。

## 下一课

契约有了，先看关掉观测时走哪条路：[02-noop.ts.md](/series/pi-source/telemetry/417-noop-ts/)。
