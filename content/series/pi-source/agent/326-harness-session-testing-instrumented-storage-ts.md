---
title: "instrumented-storage.ts — 记录每次提交的透明探针"
summary: "继承自 StorageDecorator 的测试探针。它在转发 commit 之前把本次写入批次追加到一个数组里，从而让测试断言「提交了什么、按什么顺序提交」，而完全不改变存储行为。"
tags: [pi, agent]
---

## 这个文件是什么

`instrumented-storage.ts` 定义了一个只有 21 行的测试工具 `InstrumentedStorage`（`packages/agent/src/harness/session/testing/instrumented-storage.ts:6`）。它是 `StorageDecorator` 的子类，唯一的额外职责是：**在每次 `commit` 真正发生之前，把这次的写入批次 `writes` 记录下来**。

文件顶部注释称它为「Test-only transparent Storage decorator that records commit admission」（`packages/agent/src/harness/session/testing/instrumented-storage.ts:5`）。「透明」指它不改变任何存储语义，只是旁观记录；「admission」指它记录的是「提交被受理的瞬间」——无论该提交最终成功还是失败，只要进了 `commit` 方法就会被记下。

## 逐段解析

### 字段与读取接口

```ts
/** Test-only transparent Storage decorator that records commit admission. */
export class InstrumentedStorage extends StorageDecorator {
	private readonly commitAttempts: Write[][] = [];

	getCommitAttempts(): readonly Write[][] {
		return this.commitAttempts.slice();
	}

	clearCommitAttempts(): void {
		this.commitAttempts.length = 0;
	}
```

- `commitAttempts: Write[][]`（`packages/agent/src/harness/session/testing/instrumented-storage.ts:7`）：外层数组的每一项是一次 `commit` 调用，内层数组是那次调用携带的 `Write[]`（写入批次）。
- `getCommitAttempts()` 用 `.slice()` 返回浅拷贝（`packages/agent/src/harness/session/testing/instrumented-storage.ts:9-11`），避免外部直接篡改内部记录。
- `clearCommitAttempts()` 用 `.length = 0` 清空（`packages/agent/src/harness/session/testing/instrumented-storage.ts:13-15`），方便在同一个装饰器实例上分段测量。

### 唯一的重写：commit

```ts
	override commit(writes: Write[], context: Context): Promise<CommitResult> {
		this.commitAttempts.push(writes);
		return this.delegate.commit(writes, context);
	}
}
```

逻辑极简（`packages/agent/src/harness/session/testing/instrumented-storage.ts:17-20`）：先把 `writes` 推入记录数组，再调用基类的转发逻辑（`super` 即 `StorageDecorator`，最终落到 `delegate.commit`）。它没有 `try/catch`，不吞异常，也不拦截结果——无论提交成功或抛错，记录动作已经完成，调用照常上抛。

## 它解决什么问题 / 为什么这样设计

很多行为只能通过观察「提交了什么」来验证，例如：

- 并发提交是否按受理顺序落库（序列化测试）。
- 某次失败后，是否真的没有写入任何内容（回滚测试）。
- 多个写入是否被正确分批、是否有额外的隐含提交。

`InstrumentedStorage` 把这些「不可见的提交动作」变成可断言的数据结构。它刻意保持透明，因此测试可以把它当作一个无损的「录音机」装在任何 `Storage` 实现外面，而不必担心它干扰被测行为。

## 谁调用它 / 它调用谁

- **调用者**：`index.ts:33` 把它重新导出供外部测试使用；契约测试 `conformance/storage.ts` 与并发/崩溃恢复测试会把它作为外层装饰器包在真实后端上。
- **被调用者**：继承 `StorageDecorator`，最终通过 `super.commit` 调用被包裹的 `delegate`。它通过 `import { StorageDecorator }`（`packages/agent/src/harness/session/testing/instrumented-storage.ts:3`）建立继承关系。

## 与同目录其他文件的关系

- 与 `storage-decorator.ts` 是「子类—基类」关系，本文件只 `override` 了 `commit` 一个方法。
- 与 `gating-storage.ts` 是兄弟关系，二者都建立在同一个装饰器基座上，区别在于：探针只「看」，闸门既「看」又「拦」（可挂起或丢弃提交）。
- `getCommitAttempts()` 返回的记录常被 `conformance/` 下的断言用来比对「期望的写入序列」。

## 一个典型用法示意

下面的片段演示测试如何把它包在真实后端外，断言「两次提交的写入批次按受理顺序被记录」——`getCommitAttempts()` 与 `clearCommitAttempts()` 都是真实导出的 API：

```ts
const instrumented = new InstrumentedStorage(realStorage);
await instrumented.commit([insertEntry(a)], BACKGROUND_CONTEXT);
await instrumented.commit([insertEntry(b)], BACKGROUND_CONTEXT);

const attempts = instrumented.getCommitAttempts();
// attempts 是一个 Write[][]，长度应为 2，且第一项是 a、第二项是 b
strictEqual(attempts.length, 2);
instrumented.clearCommitAttempts(); // 清空后开始下一段测量
strictEqual(instrumented.getCommitAttempts().length, 0);
```

因为 `InstrumentedStorage` 完全透明，上面的 `realStorage` 行为与没有探针时完全一致——记录动作不影响任何读写结果，这正是它能安全插进任何后端的原因。

## 自查清单

- [ ] `commitAttempts` 记录的粒度是一次 `commit` 调用，还是单条 `Write`？
- [ ] 为什么 `getCommitAttempts()` 用 `.slice()` 而非直接返回原数组？
- [ ] 若某次 `commit` 抛错，`commitAttempts` 中是否仍然包含这次的 `writes`？
- [ ] 该装饰器是否改变了存储的任何读写结果？
