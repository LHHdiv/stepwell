---
title: "conformance/session-repo.ts — 把 SessionRepo 的会话与分叉契约钉成可执行规范"
summary: "约 1185 行的 SessionRepo 契约测试套件。它按能力把契约拆成 lifecycle / ownership / messages / fork 等多组独立构建器，每个只要求后端实现接口的一个子集（Pick），让 Memory、JSONL、SQLite 等后端能按需取用、各自跑通；最终由 createSessionRepoConformance 汇总全部契约。"
tags: [pi, agent]
---

## 这个文件是什么

`conformance/session-repo.ts` 是 `SessionRepo` 接口（`packages/agent/src/harness/session/types.ts:592`）的契约测试套件。与 `conformance/storage.ts` 一次性返回全部用例不同，这个文件把契约**按能力拆成了多个构建器（builder）**，每个构建器只要求后端实现 `SessionRepo` 的一个方法子集：

```ts
// 例如生命周期组只要求这四个方法
backendFactory: () => Promise<Pick<SessionRepo<TMetadata>, "create" | "open" | "list" | "delete">>
```

（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:144`）。最终由顶层 `createSessionRepoConformance`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:1175`）把各组拼成完整契约。

> 为什么按 `Pick` 拆分组？因为后端成熟度不一：有的只实现了「创建/打开/列出/删除」还做不到「fork」。让每个构建器只声明它真正依赖的方法，未实现 fork 的后端就能先跑通 lifecycle/ownership/messages，而不必被一套全量契约挡在门外。这是「渐进式契约验证」。

## 逐段解析

### 共享常量与辅助函数（34-139 行）

- 一组固定 UUID 常量 `ROOT_ID`/`CHILD_ID`/`SIBLING_ID`/`USAGE_ID`/`OPERATION_ID`/`PENDING_ID`/`UNKNOWN_ID`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:34-40`），避免测试间 id 漂移。
- `idleLaneState`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:41-45`）：空闲泳道状态（无进行中操作、空收件箱），作为 fork 时「新鲜空闲状态」的期望值。
- `applicationValue`/`applicationList`/`configuration`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:46-52`）：应用侧的值/列表地址与泳道配置。
- `getBranchTip`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:54-56`）：拿到某分支 tip id 的小工具。
- `assistantMessage(stopReason)`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:58-89`）：构造不同 `StopReason`（stop/length/toolUse/error/aborted/deferred）的助手消息，供消息契约使用。
- `usageRow()`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:91-104`）：构造一条用量行。
- `RepoCaseContext` / `prepareRepoCaseFactory` / `createCase`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:106-139`）：本文件的用例装配三件套。`createCase` 与 storage 套件同名函数思路一致，但包的是 `repo` 而非 `storage`，并支持可选的 `close` 回调在 `finally` 里释放后端（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:130-137`）——这是有状态的 `SessionRepo` 区别于无状态 Storage fixture 的地方。

### 各组契约构建器

本文件导出的构建器形成一棵「能力树」，每个节点只要求后端实现接口的一个 `Pick` 子集。下表汇总所有构建器、它们要求的方法子集、以及对应的源码位置；树形汇总关系在末尾的「汇总构建器」给出。

| 构建器 | 要求的方法子集（Pick） | 源码行 | 契约覆盖范围 |
|---|---|---|---|
| `createSessionRepoLifecycleConformance` | `create \| open \| list \| delete` | `session-repo.ts:142` | 创建/列出/重开/删除/独占关闭 |
| `createSessionRepoOwnershipConformance` | `create \| open` | `session-repo.ts:231` | 会话句柄独占打开 |
| `createSessionRepoMessageConformance` | `create` | `session-repo.ts:250` | 助手消息落定与拒绝 |
| `createSessionRepoForkBehaviorConformance` | `create \| list \| fork` | `session-repo.ts:303` | fork 范围/祖先/状态复制 |
| `createSessionRepoForkDestinationReservationConformance` | `create \| fork` | `session-repo.ts:1041` | fork 目标 id 互斥预留 |
| `createSessionRepoForkSourceSnapshotConformance` | `create \| fork` | `session-repo.ts:1083` | fork 捕获源提交一致边界 |
| `createSessionRepoForkCoordinationConformance` | `create \| fork` | `session-repo.ts:1153` | 上述两组协调契约的并集 |
| `createSessionRepoStreamingForkConformance` | `create \| fork` | `session-repo.ts:703` | 流式 fork（Memory/JSONL 专用，见下） |
| `createSessionRepoForkConformance` | `create \| list \| fork` | `session-repo.ts:1164` | 行为 + 协调的完整 fork 契约 |
| `createSessionRepoConformance` | 全量 `SessionRepo` | `session-repo.ts:1175` | 上述所有契约的并集 |

另有三个**私有**子构建器，仅被 `StreamingForkConformance` 内部调用，不单独导出：`createSessionRepoForkLaneValidationConformance`（`:715`）、`createSessionRepoForkApplicationListConformance`（`:759`）、`createSessionRepoBranchForkApplicationStateConformance`（`:932`）。它们把「流式 fork 的列表/状态/泳道校验」拆成可独立维护的小块。

注意 `Pick` 是结构性子类型：当某个后端只实现了部分方法时，它可以把「仅含已实现方法的对象」传给对应子集构建器；而全量 `createSessionRepoConformance` 接收完整 `SessionRepo`，天然满足所有 `Pick`——这就是为什么汇总函数可以直接复用前面的子集构建器（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:1179-1184`）。

#### createSessionRepoLifecycleConformance（142-228 行）

只要求 `create | open | list | delete`。四个用例覆盖会话生命周期：

- `creates a session with no implicit branch and rejects duplicate ids`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:152`）：新会话 `storageVersion===1`、`createdAt` 是安全整数，且**不**隐式创建 `main` 分支；重复 `create` 同 id 必须 `rejects`。
- `close drains an acquired scope and rejects a queued mutation callback`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:169`）：通过 `beginMutation` 拿到活跃作用域、再 `mutate` 排队一个回调，`close` 会排空活跃作用域但**拒绝**排队中的回调（回调不应启动）。
- `lists metadata and preserves state across close and reopen`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:189`）：验证 `list` 返回的元数据（含 `parentSessionId`）与「关闭后重开仍保留 `setName` 的值」。
- `deletes closed sessions without affecting other sessions`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:214`）：删除已关闭会话不影响其他会话，且删除后 `open`/`delete` 同元数据都应 `rejects`。

#### createSessionRepoOwnershipConformance（231-247 行）

只要求 `create | open`。一个用例 `rejects opening an already-open session`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:237`）：会话被持有（open）期间再次 `open` 必须 `rejects`——守住「会话句柄独占打开」的语义。

#### createSessionRepoMessageConformance（250-300 行）

只要求 `create`。两个用例：

- `rejects pending assistant messages without changing the tree`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:259`）：`appendMessage` 一个 `pending` 状态的助手消息必须被拒，且分支树不变（tip 仍为 null、无新增条目）。
- `preserves every settled assistant stop reason`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:271`）：对 `stop/length/toolUse/error/aborted/deferred` 六种已落定 `StopReason` 各追加一条消息，断言它们都能按提交顺序持久化、分支 tip 指向最后一条。守住「所有非 pending 的停止原因都被完整保留」。

#### createSessionRepoForkBehaviorConformance（303-700 行）

只要求 `create | list | fork`。这是 fork 行为的核心契约集：

- `tree-forks a fresh session before first attachment`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:309`）：`scope:"tree"` 从一个空内容源 fork，目标应是全新会话（无分支、无值、无条目、`messageCount===0`）。
- `rejects a data-only branch and releases its destination id`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:338`）：对一个 `data` 这种「仅数据」分支做 `scope:"branch"` fork 必须 `rejects`，且 fork 失败后要**释放**目标 id（之后仍能用该 id `create`）。
- `forks one named configured branch with scoped values and a zero ledger`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:356`）：构造一个含 `main`/`review` 两条分支、丰富的泳道配置/状态/操作记录/用量/标签/Application 值的源，从 `review` 分支的 `CHILD_ID` 处 `at` 位置 fork。断言目标只带入 `ROOT_ID`/`CHILD_ID` 两个条目、`review` 分支 tip 指向 `CHILD_ID`、对应 `laneConfig` 保留但 `laneState` 被重置为 `idleLaneState`、`sessionName` 保留、而所有 Application 值/列表/操作记录/`pendingEntry` 全部**不**带过来、用量账本归零。这条用例极其细致地定义了「branch fork 该复制什么、该丢弃什么」。
- `enforces branch ancestry for at and before placement`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:496`）：测试 `before`/`at` 两种挂接位置与祖先约束——选 `ROOT_ID` 之前得到空树、选 `CHILD_ID` 之前得到 `ROOT`、`SIBLING_ID`（非该分支祖先）/`UNKNOWN_ID`/`null tip` 都必须 `rejects`。守住「fork 锚点必须是所选分支的合法祖先」。
- `forks a closed source session`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:577`）：源会话已关闭仍可被 fork，且只带配置与空闲状态、不带 Application 值。
- `forks the whole configured tree with fresh lane state`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:614`）：`scope:"tree"` 复制整棵树与所有分支 tip，各配置泳道复制配置+空闲状态，Application 值（`applicationValue`）随树复制。
- `rejects only surviving unknown reserved scalar state`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:668`）：在 `pi` 或 `pi.unknown` 命名空间写入保留标量状态会让 fork `rejects`——守住「fork 不允许残留的未知保留命名空间状态」。

#### createSessionRepoStreamingForkConformance（703-713 行）与三个私有子组

```ts
export function createSessionRepoStreamingForkConformance(...) {
	// Merge into createSessionRepoForkConformance once SQLite supports these cases.
	return [
		...createSessionRepoForkApplicationListConformance(...),
		...createSessionRepoBranchForkApplicationStateConformance(...),
		...createSessionRepoForkLaneValidationConformance(...),
	];
}
```

（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:703-713`）。文件顶部注释写得很关键：这些「流式 fork」用例当前**只为 Memory 与 JSONL 启用，SQLite 的流式 fork 实现仍 pending**（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:702`）。一旦 SQLite 支持就会并入 `createSessionRepoForkConformance`。三个子组的关注点：

- `createSessionRepoForkLaneValidationConformance`（715-756 行）：`ignores malformed unrelated lanes`——源里有一个 `unrelated` 分支的 `laneConfig` 但不属于合法泳道结构，fork 时应当忽略它（`getBranchTip(branch)` 为 null）。
- `createSessionRepoForkApplicationListConformance`（759-929 行）：针对 Application 列表的 fork 语义，按源状态 `open`/`closed` 各跑 4 类用例——「tree fork 按地址分别复制列表」「删除后重追加只复制幸存者」「保留含间隙的列表元素序列（seq 不重排）」「asc/desc 分页用源游标续读」。这是 WP08（一项分叉一致性工作项）在列表上的具体落地。
- `createSessionRepoBranchForkApplicationStateConformance`（932-1038 行）：针对分支 fork 的 Application 状态——`set v1 → fork 点 → set v2` 时分支 fork 既不复制 v1 也不复制 v2，「甚至 fork 点之前未变的值也被排除」（因为按序列过滤不够，必须用 fork 点语义）。同样按 `open`/`closed` 各两例。

三个私有子构建器各自聚焦 fork 的一个「易错面」，都按源会话状态 `open`/`closed` 各跑一遍（用 `flatMap` 展开），以确认 fork 行为与源是否仍持有句柄无关：

- `createSessionRepoForkLaneValidationConformance`（`:715`）：`ignores malformed unrelated lanes`——源里若存在一个不属于合法泳道结构的 `laneConfig("unrelated")`，fork 应当**忽略**它，目标对应分支 tip 为 null，而非把非法配置带过去。
- `createSessionRepoForkApplicationListConformance`（`:759`）：围绕 Application 列表的四条规则——（a）tree fork 按地址分别复制不同 key/命名空间的列表、互不合并；（b）`append → delete → append` 后只复制幸存元素；（c）保留含间隙的列表元素序列（seq 不重排）；（d）`asc`/`desc` 分页能用源游标在 fork 中续读，且读到末尾返回空页。
- `createSessionRepoBranchForkApplicationStateConformance`（`:932`）：branch fork 的 Application 状态排除规则——（a）`set v1 → fork 点 → set v2` 时既不复制 v1 也不复制 v2，连 fork 点之前未变的旧值也被排除（证明不能仅靠 seq 截断）；（b）`append old → fork 点 → delete → append new` 时，删除的与新建的列表元素都不带过去，连 fork 点之前幸存的元素也被排除。

这三条合起来，正是 WP08 工作项对「fork 必须精确复制/排除应用层状态」的逐项落实。

#### 分叉协调（fork coordination）两组

这两组要求 `create | fork`，验证**并发与快照边界**：

- `createSessionRepoForkDestinationReservationConformance`（1041-1080 行）：两个用例用 `Promise.allSettled` 并发发起 `create` 与 `fork` 争抢同一个目标 id，断言**先抢到 destination 预留的那一方成功、另一方 `rejects`**——守住「目标 id 预留」的互斥性（无论 create 先还是 fork 先）。
- `createSessionRepoForkSourceSnapshotConformance`（1083-1150 行）：`captures one coherent boundary between source commits`——在源会话 `beginMutation` 的第一批提交已入队但未结束时发起 `fork`，再用 `mutate` 提交第二批；断言 fork 只捕获了第一批的边界（tip 为 `ROOT_ID`、name/label 是第一批的值），第二批的 `CHILD_ID` 与改动**未**进入 fork。守住「fork 捕获的是源提交队列之间的一个一致快照点」。

#### 汇总构建器（1153-1185 行）

```ts
export function createSessionRepoForkCoordinationConformance(...) {
	return [
		...createSessionRepoForkDestinationReservationConformance(...),
		...createSessionRepoForkSourceSnapshotConformance(...),
	];
}

export function createSessionRepoForkConformance(...) {
	return [
		...createSessionRepoForkBehaviorConformance(...),
		...createSessionRepoForkCoordinationConformance(...),
	];
}

export function createSessionRepoConformance(factory, onClose?) {
	return [
		...createSessionRepoLifecycleConformance(factory, onClose),
		...createSessionRepoOwnershipConformance(factory, onClose),
		...createSessionRepoMessageConformance(factory, onClose),
		...createSessionRepoForkConformance(factory, onClose),
	];
}
```

（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:1153-1185`）。注意 `createSessionRepoConformance` 直接接收 `() => Promise<SessionRepo<TMetadata>>` 全量后端，而前面各组接收的是「方法子集工厂」——汇总时把全量工厂当作子集工厂传入即可，因为 `Pick` 是结构性子类型，全量实现天然满足子集约束。

整个构建器的组合树如下，可见「全量契约」只是若干「能力子集契约」的并集，没有重复定义任何用例：

```text
createSessionRepoConformance（全量 SessionRepo）
├── LifecycleConformance        (create|open|list|delete)
├── OwnershipConformance        (create|open)
├── MessageConformance          (create)
└── ForkConformance             (create|list|fork)
    ├── ForkBehaviorConformance (create|list|fork)
    └── ForkCoordinationConformance (create|fork)
        ├── ForkDestinationReservationConformance (create|fork)
        └── ForkSourceSnapshotConformance         (create|fork)
```

而 `StreamingForkConformance`（`create|fork`）目前**不**在 `createSessionRepoConformance` 的汇总树里，而是被各后端按需单独调用——这正是「SQLite 流式 fork 尚未就绪、先只挂到 Memory/JSONL」这一注释意图的落地方式。一旦 SQLite 支持，只需把它并回 `ForkConformance` 即可，无需改动任何既有用例。

## 它解决什么问题 / 为什么这样设计

`SessionRepo` 比 `Storage` 更高层，涉及「会话句柄独占」「fork 复制范围」「并发目标预留」「快照一致性」等更复杂的隐式约定。把它拆成能力子集的构建器，带来三层价值：

1. **渐进接入**：能力不全的后端先验证已实现的契约，不被全量套件阻塞。例如 SQLite 在流式 fork 尚未就绪时，仍可跑通 lifecycle / ownership / message / 基础 fork 行为，只是暂跳过 `StreamingForkConformance`。
2. **精准失败定位**：某组失败时，立刻知道是 lifecycle、ownership 还是 fork 语义出问题，不必在成百条用例里猜。每个 `createCase` 的 `group`/`name` 字段（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:127-129`）正是为此而生，可在报告里直接展示「`[fork coordination] captures one coherent boundary between source commits」这样的定位信息。
3. **工作项驱动扩展**：如 `StreamingForkConformance` 注释所示，新契约（WP08）可以先只挂到 Memory/JSONL，等 SQLite 跟上再并入主 fork 套件（注释见 `packages/agent/src/harness/session/testing/conformance/session-repo.ts:702-707`）——契约随实现演进，但历史契约始终保留。

### 契约测试这一模式的工程价值

与 `conformance/storage.ts` 共享同一思想，区别只是抽象层级更高：

- **接口即规格**：`createSessionRepoConformance` 返回的用例集，就是 `SessionRepo` 接口最完整、最不会过时的说明书。读它比读三个后端的实现更快理解「fork 到底复制什么、不复制什么」。
- **可组合、可裁剪**：`Pick` 子集设计让同一份契约既能「全量跑」也能「挑着跑」，测试金字塔从「一个巨大套件」变成「一组可拼装的小契约」。
- **故障注入友好**：`gating-storage.ts` 之类装饰器可包在 `factory` 提供的后端外，配合本套件的协调契约（目标预留、快照边界）模拟并发与崩溃，而无需真实并发时序的不确定性。

对 agent 包而言，这套契约是「多后端可互换」承诺的护栏：只要 Memory / JSONL / SQLite 都能跑通 `createSessionRepoConformance`，上层 harness 就能在不感知具体后端的前提下安全调用 `fork`、`open`、`delete` 等能力。

## 一个后端如何接入这套契约

接入同样类型驱动。后端作者选择一个合适的构建器（按自己实现的能力），传入对应的工厂：

```ts
import {
	createSessionRepoLifecycleConformance,
	createSessionRepoConformance,
	type ConformanceCase,
} from "./conformance/session-repo.ts";

// 只实现了生命周期的后端，先跑子集
const lifecycleCases: readonly ConformanceCase[] = createSessionRepoLifecycleConformance(
	async () => await createMyBackend(), // 返回满足 Pick<create|open|list|delete> 的对象
);

// 能力齐全的后端，跑全量
const allCases: readonly ConformanceCase[] = createSessionRepoConformance(
	async () => await createMyBackend(), // 返回完整 SessionRepo
);

for (const c of allCases) {
	await c.run(); // 包进任意运行器；失败即契约违约
}
```

注意各构建器接受的是 `() => Promise<...>` 工厂而非直接后端实例：每次 `run()` 都会重新调用工厂拿到一份独立后端（并在 `createCase` 的 `finally` 里调用可选 `onClose` 释放，`packages/agent/src/harness/session/testing/conformance/session-repo.ts:130-137`），从而保证用例间完全隔离——这正是「每个用例独立夹具」契约落地的关键。

### fork 复制 / 排除矩阵：从一条用例看契约的精确性

`forks one named configured branch with scoped values and a zero ledger`（`packages/agent/src/harness/session/testing/conformance/session-repo.ts:356`）是理解 fork 语义的关键。它构造一个含 `main`/`review` 两条分支、并填充了各类状态的源，然后从 `review` 分支的 `CHILD_ID` 处 `at` 位置做 branch fork。下表归纳这次 fork **复制了什么、排除了什么**，正是契约最容易被实现错的地方：

| 数据类别 | 在源中的状态 | branch fork（`review` @ CHILD_ID）的结果 | 依据行 |
|---|---|---|---|
| 条目（main 分支） | 含 ROOT/CHILD/SIBLING | 仅保留 `review` 祖先链上的 ROOT、CHILD | `session-repo.ts:457-459` |
| 分支 tip：`review` | 指向 CHILD_ID | 目标 `review` tip = CHILD_ID | `session-repo.ts:461` |
| 分支 tip：`main` | 指向 SIBLING_ID | 目标无 `main` 分支（undefined） | `session-repo.ts:460` |
| `laneConfig`（review） | 已配置 | **复制** | `session-repo.ts:462` |
| `laneState`（review） | 含进行中操作 | **重置为 `idleLaneState`** | `session-repo.ts:463` |
| `laneConfig`/`laneState`（main） | 已配置 | **不复制**（目标无 main） | `session-repo.ts:464-465` |
| 会话名 `sessionName` | "source name" | **复制** | `session-repo.ts:466` |
| Application 标量 `applicationValue` | {copied:false} | **不复制**（undefined） | `session-repo.ts:467` |
| Application 列表 `applicationList` | 含元素 | **不复制**（空） | `session-repo.ts:468` |
| 条目标签 `entryLabel`（ROOT/SIBLING） | "root label" / "sibling label" | ROOT 的标签复制，SIBLING 的不复制（不在祖先链） | `session-repo.ts:469-470` |
| 操作记录 `operationResult/operationMeta/operationState/operationToolArgs/operationPreparation` | 各类 | **全部不复制**（undefined） | `session-repo.ts:471-482` |
| 用量账本 `usageRow` | 1 行 | **归零**（messageCount=1 但 usage 全 0） | `session-repo.ts:483-492` |

这张矩阵说明 branch fork 的语义是「**按分支、按祖先、按类别**选择性复制」：配置随分支走、状态重置为空闲、应用侧数据与操作/用量等瞬时状态一律排除。把它写成断言，等于把「fork 到底复制什么」这个最容易各后端理解不一致的点，钉成了可执行规范。

## 谁调用它 / 它调用谁

- **调用者**：各 `SessionRepo` 后端测试（Memory/JSONL/SQLite）导入这些 builder，按需挑选（也可以直接调用顶层 `createSessionRepoConformance` 拿全量）。`index.ts:20-30` 把多个 fork 构建器与 `createSessionRepoConformance`（经 `createStorageConformance` 邻近导出）重新导出。
- **被调用者**：它调用 `values.ts` 的 `branchTip/laneConfig/laneState/setValue/appendList/...`、`commit.ts` 的 `insertEntry/insertUsage`、`context.ts` 的 `BACKGROUND_CONTEXT`、`node:assert/strict` 的断言。自身不触碰具体后端。

## 与同目录其他文件的关系

- `../types.ts` 的 `ConformanceCase` 是 `createCase` 的返回类型；`SessionRepo`/`Session`/`SessionMetadata` 是契约的对象。
- 兄弟文件 `conformance/storage.ts` 是更底层的契约；`SessionRepo` 的很多 fork 行为最终落到 `Storage` 的写入语义上，二者共同构成「存储 → 会话仓库」双层契约。
- 故障注入装饰器 `gating-storage.ts` 可包在 `factory` 提供的后端外，用来跑通「fork 期间源提交并发」这类协调契约。
- `index.ts:20-30` 把这些 fork 构建器与 `createStorageConformance` 一一重新导出，使外部测试只需从 `testing/index.ts` 一个入口即可取用全部契约与基准符号。

## 自查清单

- [ ] `createSessionRepoConformance` 汇总了哪几组子契约？顶层 factory 为什么能直接喂给各 `Pick` 子集构建器？
- [ ] `StreamingForkConformance` 当前对哪些后端启用、SQLite 处于什么状态（据文件注释）？
- [ ] `forks one named configured branch...` 用例中，哪些数据被复制到 fork、哪些被明确排除（列举至少三类被排除的）？
- [ ] `ForkDestinationReservationConformance` 用 `Promise.allSettled` 守护的是哪条并发约束？
- [ ] `ForkSourceSnapshotConformance` 验证的「一致边界」具体指 fork 跳过了源的哪一批提交？
- [ ] `StreamingForkConformance` 为什么没有直接并入 `createSessionRepoConformance` 的汇总树？
