---
title: "05 · testing/conformance.ts — 把契约钉成可跑的用例"
summary: "不要把这文件当「测试代码略过」。它是契约的可执行注释。读完应能按组说出：生命周期、status、recording、parentage、passivity 各禁止什么。自己写 adapter 时先跑这 9 条，再谈导出。"
tags: [pi, telemetry]
---
源码：`packages/telemetry/src/testing/conformance.ts`  
核心导出：`createTelemetryAdapterConformance`  
被谁调用：`packages/telemetry/test/conformance.test.ts`；外部 adapter 测试。

## 本课目标

不要把这文件当「测试代码略过」。它是契约的可执行注释。读完应能按组说出：生命周期、status、recording、parentage、passivity 各禁止什么。自己写 adapter 时先跑这 9 条，再谈导出。

## 在系统中的位置

```text
createTelemetryAdapterConformance(factory)
  返回 9 个 ConformanceCase
    run() = await using fixture = factory(); await test(fixture)
```

用的是 `node:assert/strict`：`deepStrictEqual`、`strictEqual`、`ok`、`fail`、`doesNotThrow`。和 vitest 的 `expect` 无关。

## 脚手架

`createCase(factory, group, name, test)` 把 factory 冻进闭包。每个 `run()` 新建 fixture，所以 memory 的 span id 每次从 1 开始。

`findSpan(spans, name)`：按名字找，找不到 `ok(span, ...)` 失败。假设同 fixture 内名字唯一——用例自己保证。

`rejectsWithSameValue`：`await` 之后必须是**同一引用**，不是 `equal` 内容。这卡住「把 throw 包成 `new Error(String(e))`」的 adapter。

`unreadable(value)`：Proxy，get / getOwnPropertyDescriptor / getPrototypeOf / ownKeys 全 throw。用来模拟「读 telemetry 载荷会炸」——真实世界里是有 getter 抛错的对象、被撤销的 Error、跨 realm 的奇怪值。

## 九条用例

### callback lifecycle · admits once synchronously and preserves the result

`startSpan` 返回的 Promise **还没 await**，`admitted` 必须已经是 true、`calls === 1`。然后 `await result === expected`（同一对象）。span status `ok`，`settled === true`。

禁止：把 callback 丢进 `queueMicrotask` 再跑；禁止包一层新对象当返回值。

### callback lifecycle · preserves synchronous and asynchronous rejection values

五种拒绝：同步 `throw Error`、async throw 普通对象、`Promise.reject(undefined)`、同步 throw 不可读对象、async reject 不可读对象。全部 `strictEqual` 原值。对应 span 的 `status.status === "error"`。

### status · uses last explicit status without automatic overwrite

四段：

1. `setStatus(error)` 再 `setStatus(ok)` → 最后是 ok（last-write-wins）
2. 先 `setStatus(ok)` 再 throw → 记录仍是 ok，rejection 照传
3. 先 `setStatus(error)` 再 `Promise.reject` → 记录是那条 explicit error，不是自动从 rejection 生成的
4. `setStatus(error)` 后 **正常返回** `{ ok: false }` → 记录 error。这就是「预期失败用返回值表示」的路径

### recording · merges attributes and records ordered events

start attributes 带 `ignored: undefined`（不得出现在结果里）。两次 `setAttributes`：中间写 `count: 1`，最后 `count: undefined` 不得删掉 1；`overwrite` 变成 `"end"`。两个 event 保序，event 里的 `undefined` 同样丢掉。

### recording · ignores failed attribute calls atomically

一次 `setAttributes` 里既有 `partial: "must not survive"` 又有不可读数组。整次调用不抛，最终 attributes 只有 start 时的 `retained`。禁止「写到一半留下 partial」。

### recording · makes calls after settlement inert

callback 结束后抓住 span 引用，再 `setAttributes` / `addEvent` / `setStatus` / `startSpan(child)`。前三个必须不改已记录的 span。子 `startSpan` **业务仍跑**（`childAdmitted === true`，返回 7），但 `getSpans().length === 1`，没有 late-child。

### parentage · records nested and concurrent child relationships

父 callback 里同时挂 first（等 gate）和 second（立刻完成）。先 await second，再放行 first。断言：

- parent.parentId === null
- 两个 child 的 parentId === parent.id
- `second.endSequence < first.endSequence < parent.endSequence`

这同时钉死：endSequence 在 settle 时发号；父等所有内部 Promise。

### passivity · suppresses unreadable telemetry payload failures

整个 `SpanOptions` 不可读。callback 必须仍被调用一次、返回 9，且 `getSpans()` 为空（降级 noop 或根本没记）。然后一个正常 span 里对不可读 attributes / event / status 调用 `doesNotThrow`，记录保持空 attributes、空 events、ok。

### passivity · ignores failed status calls atomically

`setStatus(unreadable)` 不抛，随后 `Promise.reject`。最终 status 必须是自动 error（因为 explicit 没写上），不能卡在 ok，也不能因为读 status 失败把业务吞掉。

## 失败与边界

- 套件不测采样、不测导出、不测后端 id 格式。那些是 adapter 的产品行为。
- `getSpans` 若漏掉仍在飞的 span，parentage 用例在 await 之后读，应当都已 settled。
- 不要在 fixture 之间共享 exporter 缓冲区。上一条的 span 会污染 `findSpan`。

## 下一课

导出收口：[06-testing.index.ts.md](/series/pi-source/telemetry/421-testing-index-ts/)。
