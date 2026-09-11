---
title: "gating-storage.ts — 可控挂起与丢弃的提交闸门"
summary: "继承自 StorageDecorator 的测试闸门。它能在「武装」后把每次提交挂起在队列里，由测试用 next() 逐个放行，或用 discard() 永久拒绝后续提交，用于确定性地复现并发争用与崩溃恢复场景。CommitDiscarded 是闸门丢弃提交时抛出的错误类型。"
tags: [pi, agent]
---

## 这个文件是什么

`gating-storage.ts` 定义了一个测试用的「提交闸门」`GatingStorage`（`packages/agent/src/harness/session/testing/gating-storage.ts:26`），它同样继承自 `StorageDecorator`，但不再是透明旁观——它**主动拦截** `commit`：

- 未武装（`armed === false`）时，提交照常直通。
- 武装后，每次 `commit` 会被「挂起」在队列中，直到测试显式放行（`next`）或永久丢弃（`discard`）。

配合 `waitPending` 与 `pending`，测试可以精确控制「哪几条提交在排队、何时落地」，从而确定性地重现并发、部分写入、存储丢失等难以在真实后端上稳定复现的场景。文件还导出了错误类型 `CommitDiscarded`，以及内部两个接口 `ParkedCommit` 与 `PendingWaiter`。

## 逐段解析

### CommitDiscarded 错误类型

```ts
/** Thrown for every commit rejected after simulated storage loss. */
export class CommitDiscarded extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CommitDiscarded";
	}
}
```

`packages/agent/src/harness/session/testing/gating-storage.ts:5-11`。一旦调用 `discard()`，此后所有提交（含仍在排队的）都会以这个错误被拒绝，用来模拟「存储已损坏 / 连接已断」。

### 类字段与 arm / pending

```ts
/** Test-only storage decorator that deterministically parks admitted commits. */
export class GatingStorage extends StorageDecorator {
	private armed = false;
	private discarded = false;
	private readonly queue: ParkedCommit[] = [];
	private readonly waiters: PendingWaiter[] = [];
```

`packages/agent/src/harness/session/testing/gating-storage.ts:26-30`。四个字段构成闸门的状态机：`armed` 是否开始拦截、`discarded` 是否已进入丢弃态、`queue` 当前挂起的提交、`waiters` 正在等待入队数量达标的外部观察者。

```ts
	/** Fixture setup bypasses gating until explicitly armed. */
	arm(): void {
		this.armed = true;
	}

	pending(): number {
		return this.queue.length;
	}
```

`packages/agent/src/harness/session/testing/gating-storage.ts:32-39`。注释点明关键设计：**夹具搭建阶段默认不拦截**，必须显式 `arm()` 才开始挂起，否则初始化数据会卡在闸门里。`pending()` 暴露当前队列长度供断言。

### waitPending

```ts
	/** Wait until at least `count` commits are parked. */
	waitPending(count = 1): Promise<void> {
		if (!Number.isSafeInteger(count) || count < 1) {
			return Promise.reject(new RangeError("Pending commit count must be a positive safe integer"));
		}
		if (this.discarded) return Promise.reject(new CommitDiscarded("storage discarded"));
		if (this.queue.length >= count) return Promise.resolve();
		return new Promise<void>((resolve, reject) => {
			this.waiters.push({ count, resolve, reject });
		});
	}
```

`packages/agent/src/harness/session/testing/gating-storage.ts:41-51`。它先校验参数（必须是正整数），若已丢弃则直接拒绝；若队列已满足数量则立即 resolve，否则把回调塞进 `waiters`——这是测试「等到恰好 N 条提交入队」的入口。

### commit 重写：挂起的核心

```ts
	override async commit(writes: Write[], context: Context): Promise<CommitResult> {
		if (this.discarded) throw new CommitDiscarded("commit rejected: storage discarded");
		if (!this.armed) return super.commit(writes, context);

		let landed!: () => void;
		let lost!: (error: Error) => void;
		const landing = new Promise<void>((resolve, reject) => {
			landed = resolve;
			lost = reject;
		});
		void landing.catch(() => {});

		const released = new Promise<void>((resolve, reject) => {
			this.queue.push({ release: resolve, drop: reject, landing });
		});
		this.notifyWaiters();

		try {
			await released;
			if (this.discarded) throw new CommitDiscarded("commit rejected: storage discarded");
			const result = await super.commit(writes, context);
			landed();
			return result;
		} catch (error) {
			const normalized = error instanceof Error ? error : new Error(String(error));
			lost(normalized);
			throw error;
		}
	}
```

`packages/agent/src/harness/session/testing/gating-storage.ts:53-81`。流程如下：若已丢弃立即抛 `CommitDiscarded`；若未武装则直通 `super.commit`；否则构造两个 Promise——`released`（由 `next` 调 `release` 解锁）与 `landing`（本次提交真正落库后由 `landed()` 解锁），把自身作为 `ParkedCommit` 入队并 `notifyWaiters()` 唤醒达标等待者。`await released` 阻塞至测试放行，放行后再次检查丢弃态，再 `super.commit` 真正落库并 `landed()` 标记完成、返回结果；若中途被 `drop` 或落库抛错，则 `lost(normalized)` 终结 `landing` 并原样上抛错误。

注意 `void landing.catch(() => {})`（`packages/agent/src/harness/session/testing/gating-storage.ts:63`）：`landing` 被 `drop` 时会以 `reject` 结束，这里吞掉它的未处理拒绝，避免 Node 报 unhandled rejection。

### next：逐个放行

```ts
	/** Release `count` commits in FIFO order and wait until each write lands. */
	async next(count = 1): Promise<void> {
		if (!Number.isSafeInteger(count) || count < 1) {
			throw new RangeError("Released commit count must be a positive safe integer");
		}
		for (let index = 0; index < count; index++) {
			await this.waitPending();
			const parked = this.queue.shift();
			if (parked === undefined) throw new Error("No parked commit");
			parked.release();
			await parked.landing;
		}
	}
```

`packages/agent/src/harness/session/testing/gating-storage.ts:83-95`。`next` 按 FIFO 顺序放行 `count` 条提交，且**等待每条的真实落库（`landing`）完成**后才处理下一条，从而精确编排「提交 A 落库 → 提交 B 落库」的交错顺序。

### discard：永久拒绝

```ts
	/** Drop parked commits and permanently reject every later commit. */
	discard(): void {
		if (this.discarded) return;
		this.discarded = true;
		const error = new CommitDiscarded("commit discarded");
		for (const parked of this.queue.splice(0)) parked.drop(error);
		for (const waiter of this.waiters.splice(0)) waiter.reject(error);
	}
```

`packages/agent/src/harness/session/testing/gating-storage.ts:97-104`。`discard` 是幂等的（已丢弃则直接返回）。它会用 `CommitDiscarded` 同时终结所有挂起提交和所有等待者，此后 `arm` 状态不再有意义——任何 `commit` 都会在第一步被拒绝。这是模拟「崩溃后存储不可用、恢复前所有写入失败」的开关。

### notifyWaiters：唤醒达标等待者

```ts
	private notifyWaiters(): void {
		for (let index = this.waiters.length - 1; index >= 0; index--) {
			const waiter = this.waiters[index]!;
			if (this.queue.length < waiter.count) continue;
			this.waiters.splice(index, 1);
			waiter.resolve();
		}
	}
```

`packages/agent/src/harness/session/testing/gating-storage.ts:106-114`。倒序遍历 `waiters`，凡是队列长度已满足其 `count` 的，就移出并 `resolve`。倒序是为了在 splice 时不打乱尚未满足的等待者下标。

## 它解决什么问题 / 为什么这样设计

真实存储后端的「并发提交」和「中途崩溃」是概率性、难以稳定复现的。本文件把这些不确定性变成**确定性的状态机**：

- 想测「两条提交同时排队」？武装后发起两条 `commit`，用 `waitPending(2)` 等到它们都入队。
- 想测「提交 A 先于 B 落库」？`next(1)` 放行 A 并等其 `landing`，再 `next(1)` 放行 B。
- 想测「存储丢失后提交必须失败」？在两条提交之间调用 `discard()`，断言它们都抛 `CommitDiscarded`。

「默认不武装、显式 arm」的设计保证了夹具初始化（写入种子数据）不受影响，只有被测行为才进入拦截态。

## 谁调用它 / 它调用谁

- **调用者**：`index.ts:32` 导出 `CommitDiscarded` 与 `GatingStorage`；并发与崩溃恢复类的契约测试、以及 harness 自身的压力测试会构造它，包在真实后端之外。
- **被调用者**：继承 `StorageDecorator`，放行时通过 `super.commit` 落到 `delegate`。它通过 `import { StorageDecorator }`（`packages/agent/src/harness/session/testing/gating-storage.ts:3`）建立继承关系。

## 与同目录其他文件的关系

- 与 `storage-decorator.ts` 是「子类—基类」关系，`commit` 是它唯一重写并显著扩展的方法。
- 与 `instrumented-storage.ts` 是兄弟：探针只记录，闸门可拦截与丢弃——二者可叠加使用（先打探针再套闸门）来同时「记录 + 控制」。
- `conformance/` 下的运行器独立框架无关，闸门常被作为「故障注入」手段注入到任意 `StorageFixture` 中。

## 自查清单

- [ ] `arm()` 之前发起的 `commit` 是否会真的被挂起，还是直通 delegate？
- [ ] `next(1)` 与 `waitPending(1)` 的区别是什么：前者是否还会等待写入真正落库？
- [ ] 调用 `discard()` 后，仍在队列中的提交与正在 `waitPending` 的外部调用分别会得到什么结果？
- [ ] `landing` 的 `void landing.catch(() => {})` 是为了避免哪种运行时问题？
