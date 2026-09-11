---
title: "04 · testing/types.ts — 一致性套件的夹具形状"
summary: "搞清「测试框架无关」是怎么做到的：套件不 import vitest，只认一份 fixture 和一组 { group, name, run }。你的 describe/it 在外面套一层。"
tags: [pi, telemetry]
---
源码：`packages/telemetry/src/testing/types.ts`（19 行）  
核心导出：`TelemetryAdapterFixture`、`TelemetryAdapterFixtureFactory`、`TelemetryAdapterConformanceCase`  
被谁调用：`conformance.ts` 的 `createCase`；包外测试把 fixture factory 交给 `createTelemetryAdapterConformance`。

## 本课目标

搞清「测试框架无关」是怎么做到的：套件不 import vitest，只认一份 fixture 和一组 `{ group, name, run }`。你的 `describe`/`it` 在外面套一层。

## 在系统中的位置

```text
createTelemetryAdapterConformance(async () => {
  const adapter = new MyAdapter();
  return {
    context: adapter.context,
    getSpans: () => adapter.normalizedSpans(),
    async [Symbol.asyncDispose]() { await adapter.close(); }
  };
})
  → TelemetryAdapterConformanceCase[]
  → 你的测试文件 for-loop 成 describe/it
```

本包自己的 `test/conformance.test.ts` 用 `InMemoryTelemetryContext` 当 fixture，证明参考实现对得上这套语义。

## 三个类型

`TelemetryAdapterFixture extends AsyncDisposable`：

- `context`：被测的 `TelemetryContext`
- `getSpans()`：把后端已结束（或可 flush）的 span **归一化**成 `RecordedTelemetrySpan[]`
- `[Symbol.asyncDispose]`：每个 case 的 `run()` 用 `await using fixture = await factory()`，case 结束必 dispose

归一化是 adapter 作者的责任。OTel 的 span 有自己的 attribute 类型、status code、parent span context。必须翻译成 memory 那份快照形状，套件才能 `deepStrictEqual`。

`getSpans` 允许先 flush 异步 exporter 再返回。所以它是 `Promise<...>`。memory 实现可以立刻 `Promise.resolve(ctx.getSpans())`。

`TelemetryAdapterFixtureFactory`：`() => Promise<fixture>`。每个 case 拿**新**实例。共享一个 context 会让 span 数组里残留上一个 case 的记录，parentage 断言会炸。

`TelemetryAdapterConformanceCase`：

- `group`：如 `"callback lifecycle"` / `"recording"` / `"parentage"` / `"passivity"`
- `name`：一条用例的短句
- `run()`：创建 fixture、跑断言、dispose

`group` 存在是为了让 vitest 可以 `describe(group, ...)` 嵌套。套件本身不分组执行，只是数据。

## 失败与边界

- testing 子路径依赖 `node:assert`（下一课才 import）。根包 `@earendil-works/pi-telemetry` 仍然 runtime-neutral。浏览器产品不要 import `/testing`。
- fixture 必须把「未记录的 span」表现为空数组或缺失，而不是 throw。套件对 passivity 用例断言 `getSpans() === []`。
- `id` / `endSequence` 只要在一次 fixture 内稳定、可比较。不必从 1 起，但 parentId 必须对得上你们自己发的 id。

## 下一课

用例正文：[05-testing.conformance.ts.md](/series/pi-source/telemetry/420-testing-conformance-ts/)。
