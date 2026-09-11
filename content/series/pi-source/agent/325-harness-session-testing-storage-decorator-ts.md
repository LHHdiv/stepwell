---
title: "storage-decorator.ts — 用装饰器给会话存储套上探针"
summary: "测试专用的 Storage 装饰器基类。它本身不做任何拦截，只是把 Storage 接口的 12 个方法原样转发给被包裹的 delegate，为仪器化、闸门等子类提供统一骨架。"
tags: [pi, agent]
---

## 这个文件是什么

`storage-decorator.ts` 定义了一个测试专用的基类 `StorageDecorator`（源码 `packages/agent/src/harness/session/testing/storage-decorator.ts:17`）。它实现了同目录 `../types.ts` 里导出的 `Storage` 接口（接口定义见 `packages/agent/src/harness/session/types.ts:455`），但**什么都不改变**——每一个方法都直接把参数转交给内部持有的 `delegate`。

它存在的唯一目的，是作为「装饰器基类」：子类只需 `override` 其中一个或几个方法，就能在不复制其余 11 个方法的前提下改变 Storage 的某一面行为。同目录的 `instrumented-storage.ts`（探针）和 `gating-storage.ts`（闸门）都继承自它。文件顶部注释写得很直白：`Test-only forwarding base for decorators that alter one part of Storage behavior`（`packages/agent/src/harness/session/testing/storage-decorator.ts:16`）。

> 装饰器（Decorator）模式在此处的含义：外层对象实现与内层对象相同的接口，把调用转发给内层，并在转发前后插入定制逻辑。这里基类负责「转发」，子类负责「插入」。

## 逐段解析

### 类声明与构造

```ts
/** Test-only forwarding base for decorators that alter one part of Storage behavior. */
export class StorageDecorator implements Storage {
	protected readonly delegate: Storage;

	constructor(delegate: Storage) {
		this.delegate = delegate;
	}
```

`delegate` 用 `protected readonly` 保护（`packages/agent/src/harness/session/testing/storage-decorator.ts:18`），`protected` 让子类（如 `GatingStorage`）能直接访问它来发起真正的写入，`readonly` 保证包裹关系在生命周期内不被替换。

### 12 个转发方法

从 `commit` 到 `close`，基类逐一实现 `Storage` 接口要求的方法，全部是「原样调用 delegate」：

```ts
commit(writes: Write[], context: Context): Promise<CommitResult> {
	return this.delegate.commit(writes, context);
}

getEntries(ids: string[], context: Context): Promise<Map<string, Entry>> {
	return this.delegate.getEntries(ids, context);
}
```

`packages/agent/src/harness/session/testing/storage-decorator.ts:24-70` 依次转发了全部 12 个方法：`commit`、`getEntries`、`getValue`、`scanValues`、`readList`、`scanBranch`、`scanBranchStructure`、`scanEntries`、`scanUsage`、`getStats`、`close`。注意这些转发的签名与 `Storage` 接口完全一致——这正是它能「无缝包裹任意实现」的前提。

### 它转发的 12 个方法一览

| 方法 | 转发到 delegate 的行为 |
|---|---|
| `commit` | 委托提交一批写入，返回 `CommitResult` |
| `getEntries` | 按 id 批量取条目，返回 `Map` |
| `getValue` | 取单个标量值 |
| `scanValues` | 按前缀扫描标量值 |
| `readList` | 分页读取列表元素 |
| `scanBranch` | 沿分支扫描条目 |
| `scanBranchStructure` | 沿分支扫描结构（不含负载） |
| `scanEntries` | 全局扫描条目 |
| `scanUsage` | 扫描用量账本 |
| `getStats` | 取会话统计 |
| `close` | 关闭存储 |

这张表与 `conformance/storage.ts` 里「Storage 接口的 12 个方法」表完全对应：基类保证这 12 个方法**每一个都不被改动地透传**，子类只需在需要的地方 `override`。

## 它解决什么问题 / 为什么这样设计

如果不提供这个基类，每个测试装饰器都得把 12 个方法复制一遍，既冗长又容易在 `Storage` 接口演进时失同步。集中成基类后：

1. **单一转发点**：接口新增方法时，只改这一处。
2. **最小重写面**：子类只 `override` 关心的方法，例如 `InstrumentedStorage` 只重写 `commit`，`GatingStorage` 也只重写 `commit`。
3. **类型安全**：`implements Storage` 强制子类最终仍然满足完整接口，编译期就能发现遗漏。

## 谁调用它 / 它调用谁

- **调用者**：`instrumented-storage.ts:3` 与 `gating-storage.ts:3` 通过 `import { StorageDecorator }` 继承它；`index.ts:34` 又把它重新导出给外部测试使用。
- **被调用者**：它只调用持有的 `delegate`（一个 `Storage` 实现，例如 Memory / JSONL / SQLite 后端）。它不直接触达任何存储细节，因此与具体后端解耦。

## 与同目录其他文件的关系

- `instrumented-storage.ts` 在 `commit` 里先记录 `writes`、再 `super.commit`，即调用本基类的转发逻辑。
- `gating-storage.ts` 在 `commit` 里做「挂起 / 释放」控制后，最终也通过 `super.commit` 落到本基类的转发逻辑。
- `types.ts:4` 的 `StorageFixture` 接口是测试夹具，装饰器常被包在夹具里给契约测试（`conformance/`）使用。

## 自查清单

- [ ] 基类是否真的实现了 `Storage` 接口的全部 12 个方法，且签名与 `packages/agent/src/harness/session/types.ts:455` 一致？
- [ ] 子类 `override commit` 时，是否仍然通过 `super.commit` 回到基类转发逻辑，从而保证其余方法不受影响？
- [ ] `delegate` 为什么用 `protected readonly` 而非 `public` 或 `private`？
- [ ] 本文件是否自身不含任何测试断言，而只提供可复用的包装能力？
