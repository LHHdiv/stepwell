---
title: "03 · memory.ts — 进程内参考 adapter"
summary: "把契约翻译成一份可变数组。读完应能指出：span id 怎么发、parent 怎么记、settle 何时发生、记录失败如何原子回退到 noop、为什么没有时间戳。"
tags: [pi, telemetry]
---
源码：`packages/telemetry/src/memory.ts`  
核心导出：`InMemoryTelemetryContext`、`RecordedTelemetrySpan`  
被谁调用：本包测试；任何想在进程内断言 span 树、又不想接 OTel 的宿主。agent-core 把它 re-export 出去。

## 本课目标

把契约翻译成一份可变数组。读完应能指出：span id 怎么发、parent 怎么记、settle 何时发生、记录失败如何原子回退到 noop、为什么没有时间戳。

## 在系统中的位置

```text
const telemetry = new InMemoryTelemetryContext();
await telemetry.startSpan({ name: "parent" }, async (parent) => {
  await parent.startSpan({ name: "child" }, async (child) => {
    child.addEvent("retry");
    child.setAttributes({ count: 1 });
  });
});
telemetry.getSpans()  →  按 start 顺序的快照
```

每个实例一份 `InMemoryTelemetryState`。测试要隔离就 `new` 一份，不要共用。

## 记录形状

`RecordedTelemetrySpan` 是对外快照：`id`、`parentId`、`name`、合并后的 `attributes`、有序 `events`、最终 `status`、`settled`、可选 `endSequence`。

内部 `MutableRecordedTelemetrySpan` 多一个 `explicitStatus`：用来区分「自动 error」和「用户 setStatus」。settle 时只有 `failed && !explicitStatus` 才写成自动 error。

没有时间戳。比较先后用 `endSequence`（在 settle 时从 `nextEndSequence` 递增）。start 顺序就是数组下标顺序（`id` 从 1 起）。

## 属性拷贝

`copyAttributeValue`：数组浅拷一份，标量原样。`copyAttributes` 跳过 `undefined`。`mergeAttributes` 后写覆盖先写，`undefined` 仍忽略——所以 `setAttributes({ count: undefined, overwrite: "end" })` 不会删掉已有的 `count`。

`copyStatus` 深拷 `error.{name,message}`，避免调用方事后改对象污染记录。

`automaticErrorStatus`：只有 `error instanceof Error` 才填 name/message，而且包在 try 里。不可读的 throw 值（Proxy）变成光秃 `{ status: "error" }`，业务 rejection 值原样传播。

## `startInMemorySpan`

这是心脏。

1. **父已 settle** → 直接 `NOOP_TELEMETRY_CONTEXT.startSpan`。子 callback 仍跑，但不进数组。这对应 conformance「settled 之后 startSpan 仍准入，但不记录」。
2. **`createSpan` 自己 throw**（例如读 `options.name` 时 options 是会炸的 Proxy）→ catch 后同样降级 noop，**数组不变**。业务 callback 仍然调用恰好一次。
3. 成功则 `state.spans.push`，再构造一个闭包 span：
   - `startSpan` → 递归 `startInMemorySpan(state, recordedSpan, ...)`
   - `addEvent` / `setAttributes` / `setStatus`：已 settle 则 return；try 里改记录，catch 吞掉
4. **同步调用** `callback(span)`。throw → `settleSpan(..., true, error)` + `Promise.reject(error)`。
5. 否则 `Promise.resolve(result).then(成功 settle, 失败 settle 再 throw)`。

`setAttributes` 的 try 包住整个 `mergeAttributes`。conformance 要求「失败原子」：一个 bag 里既有正常键又有不可读数组，整次 merge 丢弃，已有 attributes 不动。实现正好是：先 `copyAttributes(current)` 再逐项写入；中途 throw 则赋值不发生。

`setStatus` 成功才把 `explicitStatus = true`。不可读 status 对象 throw → 保持原 status，之后业务再 reject，自动 error 仍然能写上（因为 explicit 还是 false）。这是「ignores failed status calls atomically」那条用例。

## `InMemoryTelemetryContext`

```ts
startSpan(options, callback) {
  return startInMemorySpan(this.state, undefined, options, callback);
}
```

根 span 的 parent 是 `undefined`，`parentId` 为 `null`。

`getSpans()` 每次深拷一份快照。正在跑的 span `settled: false` 且没有 `endSequence`，用条件展开省略该字段。调用方可在 callback 里同步 `getSpans()` 看到未结束的记录——但通常等 await 回来再读。

存储无界。不要在生产请求路径上用同一个实例挂一辈子。

## 失败与边界

- 并发子 span：两个 `parent.startSpan` 同时挂着，parentId 都指向父；谁先 settle 谁 `endSequence` 更小。父必须等 callback（含其内部 await）结束才 settle，所以父的 `endSequence` 一定最大。
- 记录方法不抛。应用用 try/catch 包 `setAttributes` 是多余的，也测不出来 adapter 是否老实。
- 本 adapter 不激活任何 ambient context。OTel 自动 instrumentation 看不到这些 span，除非你另写 adapter。
- `id` 在 create 失败时不会消耗——失败发生在 `createSpan` 里，`nextSpanId++` 是 create 成功路径的一部分。options 不可读时 `options.name` 一读就 throw，id 不加。

## 下一课

自己写 adapter 时不要靠读 memory 源码猜语义，去跑一致性套件。[04-testing.types.ts.md](/series/pi-source/telemetry/419-testing-types-ts/)。
