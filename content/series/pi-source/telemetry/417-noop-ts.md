---
title: "02 · noop.ts — 关掉观测时仍走同一套 API"
summary: "看清 noop 不是空函数黑洞。它必须满足和真 adapter 相同的回调契约：同步准入一次、保留返回值、同步 throw 变成 rejected Promise、嵌套 startSpan 仍然调用业务。读完应能指出为什么整个进程共用一"
tags: [pi, telemetry]
---
源码：`packages/telemetry/src/noop.ts`（21 行）  
核心导出：`NOOP_TELEMETRY_CONTEXT`  
被谁调用：`getTelemetryContext` 在 Context 上没挂 telemetry 时；`InMemoryTelemetryContext` 在父 span 已 settle 或创建记录失败时降级；应用把 telemetry 当可选参数的默认值。

## 本课目标

看清 noop **不是**空函数黑洞。它必须满足和真 adapter 相同的回调契约：同步准入一次、保留返回值、同步 throw 变成 rejected Promise、嵌套 `startSpan` 仍然调用业务。读完应能指出为什么整个进程共用一个冻结对象。

## 在系统中的位置

```text
harness 代码
  getTelemetryContext(ctx)  →  没挂过 withTelemetryContext
       ↓
  NOOP_TELEMETRY_CONTEXT.startSpan(options, callback)
       ↓
  callback(noopTelemetrySpan)   同步
  名字 / 属性 / 事件全部丢掉
```

coding-agent 主链根本不走到这里。Harness 路径几乎总是落到 noop，除非测试或宿主注入了真 context。

## 逐行

```ts
function startNoopSpan<T>(_options: SpanOptions, callback: (span: TelemetrySpan) => T | Promise<T>): Promise<T> {
  try {
    return Promise.resolve(callback(noopTelemetrySpan));
  } catch (error) {
    return Promise.reject(error);
  }
}
```

`_options` 不读。不拷贝 attributes，所以即使 options 是会 throw 的 Proxy（conformance 的 `unreadable`），noop 也没事——它碰都没碰。这和 memory adapter 不同：memory 创建记录失败才降级到 noop。

`Promise.resolve(callback(...))`：

- 同步返回值 → fulfilled Promise，同一引用
- 返回 already-rejected Promise → 原样传播 rejection
- 同步 throw → 被 catch，再 `Promise.reject(error)`，**同一个 error 对象**

这三条是契约。`await NOOP.startSpan(..., () => { throw e })` 必须 reject 成 `e`，不能包一层。

```ts
const noopTelemetrySpan: TelemetrySpan = {
  startSpan: startNoopSpan,
  addEvent: () => {},
  setAttributes: () => {},
  setStatus: () => {},
};
Object.freeze(noopTelemetrySpan);

export const NOOP_TELEMETRY_CONTEXT: TelemetryContext = noopTelemetrySpan;
```

Span 即 Context。嵌套 `span.startSpan` 还是同一个冻结对象。`Object.freeze` 防止测试或应用给它挂字段、误当成有状态的 span。

`addEvent` / `setAttributes` / `setStatus` 是空函数：调用合法、不抛、不记。settle 之后再调也一样——反正没有 settle 这个概念。

## 失败与边界

- 不保留任何数据。用 noop 做「我发出了哪些 span」的断言，永远是空。
- 业务 callback 抛错时，noop **不会**尝试读 `error.name`。memory adapter 会（包在 try 里）。
- 共享单例。不要在上面存应用状态。
- 若 callback 返回 thenable 但不是标准 Promise，`Promise.resolve` 会跟 then。这和 memory 的 `Promise.resolve(result).then(...)` 行为对齐。

## 下一课

对照参考实现：它如何在「记录失败不得影响业务」的前提下真的把树记下来。[03-memory.ts.md](/series/pi-source/telemetry/418-memory-ts/)。
