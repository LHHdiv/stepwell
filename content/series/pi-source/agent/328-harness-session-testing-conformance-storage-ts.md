---
title: "conformance/storage.ts — 把 Storage 接口约束写成可执行断言"
summary: "约 920 行的 Storage 契约测试套件。createStorageConformance(factory) 接收「生产一份全新 StorageFixture 的工厂」，返回一组运行器无关的 ConformanceCase。它把 Storage 接口的所有隐式约定——原子提交、回滚、id 命名空间、父级解析、分支扫描语义——变成可被任何后端（Memory / JSONL / SQLite）统一跑通的断言。"
tags: [pi, agent]
---

## 这个文件是什么

`conformance/storage.ts` 是 harness 会话测试基础设施里的「契约测试套件」（conformance test suite），针对 `Storage` 接口（`packages/agent/src/harness/session/types.ts:455`）。它导出一个工厂函数 `createStorageConformance`（`packages/agent/src/harness/session/testing/conformance/storage.ts:134`），签名是：

```ts
export function createStorageConformance(factory: () => Promise<StorageFixture>): readonly ConformanceCase[]
```

调用方只传入一个 `factory`：每次执行一个用例前，由它生产一份**全新的、独立的** `StorageFixture`（`StorageFixture` 见 `../types.ts:4`，本质是「拥有自己的 `storage` 并实现了 `AsyncDisposable` 的测试夹具」）。`createStorageConformance` 据此返回一组 `ConformanceCase`——也就是「某后端实现 Storage 接口时，必须满足的全部行为契约」。

> 契约测试（Contract Testing）的精髓：不测具体后端怎么实现，只测「它是否遵守接口承诺」。任何后端只要能跑通这套用例，调用方就可以放心使用，不必关心它是内存、JSONL 还是 SQLite。它相当于接口的「可执行规范」。

## 为什么需要「运行器无关的 ConformanceCase」

文件顶部导入的是 Node 自带的 `node:assert/strict`（`packages/agent/src/harness/session/testing/conformance/storage.ts:1`），而非某个测试框架的 `expect`/`it`。用例被包装成 `ConformanceCase` 接口（定义于 `../types.ts:8`）：

```ts
export interface ConformanceCase {
	readonly group: string;
	readonly name: string;
	run(): Promise<void>;
}
```

这意味着**这套契约与具体测试运行器解耦**：Mocha、Vitest、node:test，甚至自定义的循环，都能直接 `for (const c of cases) await c.run()`。各后端只需提供 `factory`，即可复用同一份规范，避免「每个后端各写一套测试导致行为漂移」。

## 逐段解析

### Storage 接口的 12 个方法（契约的边界）

理解这套契约前，先看清被约束的对象——`Storage` 接口（`packages/agent/src/harness/session/types.ts:455-471`）共有 12 个方法，契约测试就是这 12 个方法的行为规范：

| 方法 | 语义 | 主要被哪组契约覆盖 |
|---|---|---|
| `commit(writes, context)` | 原子提交一批写入（条目/用量/值/列表），返回 `seqs` 与 `stats` | transactions, values, lists, serialization, lifecycle |
| `getEntries(ids, context)` | 按 id 批量取条目 | transactions, entry queries |
| `getValue(address, context)` | 取单个标量值 | values, transactions(pending) |
| `scanValues(prefix, context)` | 按前缀扫描标量值 | values |
| `readList(address, options, context)` | 分页读列表元素 | lists |
| `scanBranch(query, context)` | 沿分支扫描条目（含负载） | branch queries, transactions(parent) |
| `scanBranchStructure(query, context)` | 沿分支扫描结构（无负载） | branch queries |
| `scanEntries(query, context)` | 全局扫描条目 | entry queries, serialization |
| `scanUsage(query, context)` | 扫描用量账本 | usage and stats |
| `getStats(context)` | 取会话统计 | usage and stats, transactions, lifecycle |
| `close(context)` | 关闭并封口 | lifecycle |
| （隐含）`Symbol.asyncDispose` | 由 `StorageFixture` 承载，用例结束后清理 | 全部（通过 `createCase`） |

注意 `commit` 是唯一会**改变**状态的方法，其余 10 个都是读取；这也解释了为什么契约里绝大多数「失败回滚」「并发顺序」「关闭封口」的断言都围绕 `commit` 展开。

### 测试数据与辅助函数（1-132 行）

- 常量与地址构造器：`MESSAGE_TIMESTAMP`（`packages/agent/src/harness/session/testing/conformance/storage.ts:30`）固定时间戳；`testName`、`testValue`、`testList`（`packages/agent/src/harness/session/testing/conformance/storage.ts:31-34`）用 `values.ts` 的 `value` / `list` 工厂生成确定性的测试地址。
- `usage()` / `zeroUsage()`（`packages/agent/src/harness/session/testing/conformance/storage.ts:54-82`）：构造 `Usage` 用量对象，供用量账本与统计断言使用。
- `userEntry` / `customEntry` / `compactionEntry`（`packages/agent/src/harness/session/testing/conformance/storage.ts:84-116`）：生成三种 `NewEntry`，作为提交内容。
- `ids()`（`packages/agent/src/harness/session/testing/conformance/storage.ts:119-121`）：从 `Entry|EntryStructure` 数组里抽出 `id` 列表，方便比对分支/扫描结果顺序。
- `assertStrictlyIncreasing()`（`packages/agent/src/harness/session/testing/conformance/storage.ts:123-127`）：校验 `seq` 序列严格递增——这是「提交顺序」契约的核心不变量。
- `assertCommitStats()`（`packages/agent/src/harness/session/testing/conformance/storage.ts:129-131`）：校验 `result.stats` 与 `storage.getStats()` 完全一致，即「提交返回的统计即最新全局统计」。

### 用例装配器 createCase（38-52 行）

```ts
function createCase(
	factory: () => Promise<StorageFixture>,
	group: string,
	name: string,
	test: ConformanceTest,
): ConformanceCase {
	return {
		group,
		name,
		async run() {
			await using fixture = await factory();
			await test(fixture);
		},
	};
}
```

`packages/agent/src/harness/session/testing/conformance/storage.ts:38-52`。关键点：用 `await using fixture = await factory()`（`packages/agent/src/harness/session/testing/conformance/storage.ts:48`）——`using` 是 TC39 显式资源管理语法，`fixture` 在 `run()` 结束时自动 `await dispose()`，保证每个用例跑完后存储被清理，用例之间互不污染。这是「每个用例独立夹具」契约的落地。

### 21 条契约用例速查表

`createStorageConformance` 返回的数组共 **21 个用例**（`packages/agent/src/harness/session/testing/conformance/storage.ts:135-919`），按 `group` 分为 8 类。下表给出每条用例的 `group`、`name` 与源码起始行，便于后端作者在失败时快速定位：

| group | 用例 name | 源码行 |
|---|---|---|
| transactions | commits mixed writes atomically in write order | `storage.ts:136` |
| transactions | rolls back every store when a mixed transaction fails | `storage.ts:165` |
| transactions | preserves overwritten and deleted values when a transaction fails | `storage.ts:197` |
| transactions | enforces one shared entry and usage id namespace | `storage.ts:231` |
| transactions | resolves parents only from prior entries and earlier writes | `storage.ts:274` |
| transactions | places pending content under its reserved entry id | `storage.ts:316` |
| values | sets, replaces, deletes, and recreates values without tombstones | `storage.ts:350` |
| values | applies same-transaction value and list operations in write order | `storage.ts:391` |
| values | does not change historical stores during value-only commits | `storage.ts:428` |
| lists | pages appends by global sequence and deletes whole lists | `storage.ts:460` |
| lists | clamps one read page without limiting list growth | `storage.ts:511` |
| lists | commits mixed list writes atomically and rolls them back with siblings | `storage.ts:534` |
| entry queries | stores custom entries with and without data | `storage.ts:566` |
| entry queries | scans global entries with explicit ranges, filters, orders, and limits | `storage.ts:601` |
| branch queries | applies stops before filters and cursors before limits | `storage.ts:643` |
| branch queries | returns branch structure without payload fields | `storage.ts:722` |
| branch queries | applies branch query semantics to structure scans | `storage.ts:750` |
| usage and stats | scans the usage ledger with explicit ranges, orders, and limits | `storage.ts:789` |
| usage and stats | keeps stats equal to message count and ledger totals | `storage.ts:824` |
| serialization | serializes back-to-back commits in admission order | `storage.ts:874` |
| lifecycle | seals admission, drains admitted commits, and closes idempotently | `storage.ts:891` |

这张表本身就是「接口行为的目录」：任何一条不在表里的 `Storage` 行为，要么被刻意留白（交给具体后端自行保证），要么就是契约尚未覆盖、需要补用例的地方。

### 各 group 守护的核心不变量

把上表的 21 条用例归纳为 8 条「后端必须满足的硬约束」，可以更清楚地看到这套契约的覆盖面：

| group | 守护的核心不变量 |
|---|---|
| transactions | 一次 `commit` 是原子事务：混合写入按批内顺序获得连续 `seq`；任意写入失败则**整体回滚**到提交前状态；条目与用量共享同一 id 命名空间；`parentId` 只能指向已有条目或同事务更早写入；流式 `pending` 占位在正式落位前对外不可见。 |
| values | 值无墓碑（删除即真删，不残留删除标记）；支持 Unicode/代理对键；同一事务内多操作以批内写顺序最终生效；只改值的提交不触动历史条目/用量/统计。 |
| lists | 列表元素按全局 `seq` 排序分页；非法分页参数（`limit:0`、`limit:MAX`）必须拒绝；单页上限只约束单次读、不限制列表总长；列表写入与兄弟数据原子提交并回滚。 |
| entry queries | `custom` 条目可带或不带 `data` 且原样持久化；`scanEntries` 支持 type/自定义类型/seq 区间/排序/分页的精确组合。 |
| branch queries | 查询修饰符优先级固定为「停止条件 → 类型过滤 → 游标 → 分页」；`scanBranchStructure` 返回**不含负载**的 `EntryStructure`；非法 `start` 必须拒绝。 |
| usage and stats | `scanUsage` 同样支持 seq 区间/排序/分页；`getStats` 的 `messageCount` 与 `usage` 必须恒等于账本逐项累加，是账本的真值派生。 |
| serialization | 即使并发提交，`seq` 仍严格按**受理顺序**单调递增。 |
| lifecycle | `close` 即封口：之后所有读写拒绝；但 `close` 前已受理的提交必须排空并完成；`close` 本身幂等。 |

这 8 条不变量合起来，就是 `Storage` 接口对调用方做出的全部承诺。任何后端只要逐条满足，调用方就能在不读其源码的情况下放心替换。

### 契约分组一览（134-919 行）

下面逐组说明它在「守住什么接口约定」。

#### 1. transactions（事务语义，136-348 行）

这是 Storage 最重要的契约——「一次 `commit` 是一个原子事务」。

- `commits mixed writes atomically in write order`（`packages/agent/src/harness/session/testing/conformance/storage.ts:136`）：一次提交混合写入「条目 + 值 + 用量」，断言 `result.seqs` 长度等于 3、`firstSeq === seqs[0]`、seq 严格递增、`getStats` 与提交返回一致，且三类数据都能按各自 `seq` 读出。守住「混合写入按批内顺序获得连续 seq」。
- `rolls back every store when a mixed transaction fails`（`packages/agent/src/harness/session/testing/conformance/storage.ts:165`）：先写入 `root` 与一条用量作为基线，再提交一个**故意冲突**的事务（`customEntry("taken", "root")` 与已存在的 `id: "taken"` 用量撞 id），断言 `rejects` 后，条目、用量、统计、值都与基线**完全相同**——守住「失败事务整体回滚，零残留」。
- `preserves overwritten and deleted values when a transaction fails`（`packages/agent/src/harness/session/testing/conformance/storage.ts:197`）：先写入 `overwritten=original`、`deleted={kept:true}`，再提交一个失败事务试图改写/删除它们，断言旧值原封不动。守住「回滚要还原被覆盖与被删除的值」。
- `enforces one shared entry and usage id namespace`（`packages/agent/src/harness/session/testing/conformance/storage.ts:231`）：条目与用量**共享同一个 id 命名空间**——用 `existing-entry` 作条目 id 后，再把它当用量 id 会 `rejects`；反之亦然。还测了「先条目后用量」「先用后条目」两种顺序都必须拒绝重复 id。守住「跨类别 id 唯一」。
- `resolves parents only from prior entries and earlier writes`（`packages/agent/src/harness/session/testing/conformance/storage.ts:274`）：父级 `parentId` 只能指向「已存在条目」或「同一事务更早的写入」；`before-parent` 引用了晚于它的 `later-parent` 会被拒，`orphan` 引用缺失 id 会被拒，`usage` 不能作为父级。守住「分支树的父级解析规则」。
- `places pending content under its reserved entry id`（`packages/agent/src/harness/session/testing/conformance/storage.ts:316`）：演示「pending 暂存」机制——先用 `pendingEntry(id)` 占位、`branchTip("main")` 置空，再正式 `insertEntry` 时把占位内容移到真实条目、清掉 pending、把 tip 指向该 id。守住「流式写入的占位→落位协议」（与 `values.ts` 的 `pendingEntry`/`branchTip` 协作）。

#### 2. values（标量值语义，350-458 行）

- `sets, replaces, deletes, and recreates values without tombstones`（`packages/agent/src/harness/session/testing/conformance/storage.ts:350`）：覆盖 `setValue` 设值、`setValue(...,null)` 置空、`deleteValue` 删除、`setValue` 重建的完整生命周期，并特意用 `prefix/\ue000`（私有区码点）、`prefix/\u{10000}`（代理对码点）验证键编码正确性，以及 `scanValues` 按前缀扫描并排除已删除。守住「值不带墓碑、支持 Unicode 键、前缀扫描正确」。
- `applies same-transaction value and list operations in write order`（`packages/agent/src/harness/session/testing/conformance/storage.ts:391`）：同一事务内先删后写的值、先追加后删的列表，必须以**批内写顺序**最后生效。守住「同事务内操作顺序即生效顺序」。
- `does not change historical stores during value-only commits`（`packages/agent/src/harness/session/testing/conformance/storage.ts:428`）：只改值的提交不能改动既有条目/用量/统计。守住「值提交与历史数据隔离」。

#### 3. lists（列表语义，460-564 行）

- `pages appends by global sequence and deletes whole lists`（`packages/agent/src/harness/session/testing/conformance/storage.ts:460`）：`appendList` 的元素按全局 seq 排序分页；验证 `cursor + limit` 翻页、`order desc` 倒序、以及 `limit:0` 和 `limit:Number.MAX_VALUE` 必须 `rejects`（非法分页参数）；`deleteList` 删除整张列表。守住「列表分页契约与参数校验」。
- `clamps one read page without limiting list growth`（`packages/agent/src/harness/session/testing/conformance/storage.ts:511`）：写入 10001 条，首屏只返回 1000 条，但用超大 `limit` 能读到全部 10000 条——单页上限是「读取夹紧」，不限制列表总长。守住「分页上限只约束单次读，不约束写入」。
- `commits mixed list writes atomically and rolls them back with siblings`（`packages/agent/src/harness/session/testing/conformance/storage.ts:534`）：列表写入与条目/值/用量在同一事务里原子提交，失败时连同兄弟数据一起回滚。

#### 4. entry queries（条目查询，566-641 行）

- `stores custom entries with and without data`（`packages/agent/src/harness/session/testing/conformance/storage.ts:566`）：`custom` 类型条目可带或不带 `data`，且 `data` 会被原样持久化（测了 `nested:[1,2]` 的嵌套结构）。
- `scans global entries with explicit ranges, filters, orders, and limits`（`packages/agent/src/harness/session/testing/conformance/storage.ts:601`）：`scanEntries` 按 `type`/`customType`/`fromSeq`/`toSeq`/`order`/`limit` 精确过滤与排序。

#### 5. branch queries（分支查询，643-787 行）

- `applies stops before filters and cursors before limits`（`packages/agent/src/harness/session/testing/conformance/storage.ts:643`）：验证查询修饰符的**优先级顺序**——`stopAtType`/`stopAtId`（停止条件）先于 `type`（过滤）、`cursor`（游标）先于 `limit`（分页）。这是分支扫描里最容易被后端实现错的顺序约束，所以用多个方向组合反复测。
- `returns branch structure without payload fields`（`packages/agent/src/harness/session/testing/conformance/storage.ts:722`）：`scanBranchStructure` 返回的 `EntryStructure` 只含 `id/parentId/seq/timestamp/type/customType`，**不含** `message` 等负载字段——注释特别提到这是为 SQLite 的「无负载分支扫描」准备的契约（`packages/agent/src/harness/session/testing/conformance/storage.ts:118`）。
- `applies branch query semantics to structure scans`（`packages/agent/src/harness/session/testing/conformance/storage.ts:750`）：把分支查询语义同样施加到结构扫描，并断言 `start:"missing"` 必须 `rejects`。

#### 6. usage and stats（用量与统计，789-872 行）

- `scans the usage ledger with explicit ranges, orders, and limits`（`packages/agent/src/harness/session/testing/conformance/storage.ts:789`）：`scanUsage` 同样支持 `fromSeq`/`toSeq`/`order`/`limit`。
- `keeps stats equal to message count and ledger totals`（`packages/agent/src/harness/session/testing/conformance/storage.ts:824`）：`getStats().messageCount` 等于消息条目数，`getStats().usage` 等于用量账本逐项累加（含 `cacheWrite1h`/`reasoning` 等扩展字段）。守住「统计是账本的真值派生」。

#### 7. serialization（序列化，874-889 行）

- `serializes back-to-back commits in admission order`（`packages/agent/src/harness/session/testing/conformance/storage.ts:874`）：并发发起两条 `commit`，断言先受理的 `seq` 小于后受理的，且 `getStats` 在两条都落地后反映累计计数。守住「即使是并发提交，seq 也必须按受理顺序单调递增」。

#### 8. lifecycle（生命周期，891-918 行）

- `seals admission, drains admitted commits, and closes idempotently`（`packages/agent/src/harness/session/testing/conformance/storage.ts:891`）：在已 `close` 之后再调用 `getStats`/`commit` 都应 `rejects`，但已受理、在关闭前发起的提交仍需**排空并完成**（`admitted` 仍能拿到 `seqs`）；`close` 调用两次都应成功（幂等）。守住「关闭即封口，但已受理事务不丢」。

## 它解决什么问题 / 为什么这样设计

`Storage` 是一个有多后端（Memory、JSONL、SQLite）共享的抽象。如果各后端各自写测试，极易出现「A 后端支持但 B 后端遗漏某约定」的漂移，导致调用方在切换后端时踩坑。把契约集中成一份「可执行规范」后：

1. **单一事实源**：接口行为只在这里被权威定义一次。任何人想了解 `Storage` 的承诺，读这 920 行比读三个后端的实现更快、更准。
2. **后端即插即测**：新增后端只需提供 `factory`，立刻获得 21 条契约验证，不必从零设计测试。
3. **运行器无关**：`ConformanceCase` 的 `run()` 不依赖任何框架，CI 里可任意编排——包成 `describe/it`、包成 `node:test` 的 `test()`，或直接 `for...await` 皆可。
4. **先写契约再写实现**：这本质是测试驱动接口设计——接口承诺即测试。当有人给 `Storage` 加新方法，第一反应应是先在这里加一条 `createCase`，而非先改实现再补测试。

### 契约测试这一模式的工程价值

「契约测试」不同于「单元测试」也不同于「集成测试」：

- 单元测试关注**实现内部**逻辑，换实现就要重写；契约测试关注**接口边界**行为，实现可随意替换。
- 集成测试关注**真实依赖**是否联通；契约测试用 `factory` 注入**任意**实现（包括内存后端），既能验真后端，也能配合 `gating-storage.ts` 这样的故障注入装饰器模拟异常后端。
- 它把「文档」变成「会跑的文档」——`createStorageConformance` 的 21 条用例，实际上就是 `Storage` 接口的完整、可执行、永不陈旧的规格说明。

对 harness 这种「多后端共享抽象」的代码库，契约测试是防止行为漂移的护栏：只要三个后端都能 `run()` 绿，调用方就可以对任意后端一视同仁。

## 一个后端如何接入这套契约

接入方式完全是类型驱动的。后端作者只需提供一个返回 `StorageFixture` 的工厂：

```ts
import { createStorageConformance, type ConformanceCase } from "./conformance/storage.ts";
import type { StorageFixture } from "./types.ts";

// 工厂每次返回一份全新、独立的 fixture
async function makeFixture(): Promise<StorageFixture> {
	const storage = await createMyBackend(); // 真实的 Memory / JSONL / SQLite 实例
	return {
		storage,
		async [Symbol.asyncDispose]() {
			await storage.close(BACKGROUND_CONTEXT);
		},
	};
}

const cases: readonly ConformanceCase[] = createStorageConformance(makeFixture);
for (const c of cases) {
	// 包进任意运行器；这里演示最朴素的裸跑
	try {
		await c.run();
		console.log(`PASS [${c.group}] ${c.name}`);
	} catch (error) {
		console.error(`FAIL [${c.group}] ${c.name}`, error);
	}
}
```

关键点都来自真实类型：`StorageFixture` 要求 `storage` 字段加 `AsyncDisposable`（`packages/agent/src/harness/session/testing/types.ts:4`）；`createCase` 内部正是用 `await using fixture = await factory()` 触发这个 `Symbol.asyncDispose` 来完成清理（`packages/agent/src/harness/session/testing/conformance/storage.ts:48`）。所以后端作者只要让 fixture 正确实现释放逻辑，每个用例结束时的清理就自动发生，用例之间天然隔离。

## 谁调用它 / 它调用谁

- **调用者**：各 `Storage` 后端的测试文件（如 Memory/JSONL/SQLite 各自的测试套件）会 `import { createStorageConformance }`（`packages/agent/src/harness/session/testing/conformance/storage.ts:134`），传入该后端的 `factory`，再逐个 `run()`。
- **被调用者**：它调用 `values.ts` 的 `value/list/setValue/appendList/...`（构造写入）、`commit.ts` 的 `insertEntry/insertUsage`（构造条目/用量写入）、`context.ts` 的 `BACKGROUND_CONTEXT`（后台上下文），以及 `node:assert/strict` 的断言。自身不触碰任何具体后端。

## 与同目录其他文件的关系

- `../types.ts` 提供 `StorageFixture` 与 `ConformanceCase`——本文件的输入与输出类型都来自这里。
- `index.ts:31` 把 `createStorageConformance` 重新导出，作为测试基础设施的公共入口。
- 兄弟文件 `conformance/session-repo.ts` 是同一思想在更高层 `SessionRepo` 接口上的应用。
- 装饰器 `gating-storage.ts` / `instrumented-storage.ts` 常被注入到 `factory` 提供的 fixture 中，作为故障注入或记录手段来跑通这里的并发/回滚契约。

## 自查清单

- [ ] `createStorageConformance` 返回多少条用例？它们被分成哪 8 个 `group`？
- [ ] `createCase` 为什么用 `await using fixture = await factory()`，而不是手动 `try/finally` 清理？
- [ ] `enforces one shared entry and usage id namespace` 这一用例守护的是哪条跨类别约束？
- [ ] `scanBranchStructure` 返回的 `EntryStructure` 相比完整 `Entry` 少了哪些字段，为什么这是有意为之？
- [ ] 若某后端在 `close` 之后还能成功 `commit`，会违背本套件里哪一条生命周期契约？
