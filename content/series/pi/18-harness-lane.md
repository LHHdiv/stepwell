---
title: 第18讲·harness 持久会话：AgentHarness 与 lane reducer
summary: AgentHarness 把对话存进可恢复的 SessionState，lane 是会话内的并发工作线，reduceLaneState 把它合并成一份快照——卷三收尾。
objectives:
  - 说清 AgentHarness 作为"持久会话主机"持有哪两类东西（Session + Lane 接口）
  - 解释 SessionState 用什么数据结构记录整段对话与分支
  - 描述 reduceLaneState 如何把并发 lane 的状态从持久记录里重建出来
tags: [pi, harness, 持久会话]
keyPoints:
  - AgentHarness（harness/agent-harness.ts:305）实现 AgentLane，是跨进程的"持久会话主机"，持有 durableSession（:310）
  - 一个 Session 里可以有多条 lane（并发工作线），lanes 用 name→leafId 映射记录各线进度（session/state.ts:57）
  - SessionState（session/state.ts:50）用 entries/records/lanes 三张表 + 单调递增 sequence 记录一切，applyMutation（:97）保证写入严格有序
  - reduceLaneState（reducer.ts:506）是纯函数：给定持久记录与条目，无副作用地重建某条 lane 的编排状态（挂起的 steer/followUp/未决写）
  - lane = 会话内的一条并发工作线；崩溃恢复时 reducer 不重跑历史，只从记录"推导"出当前该接着干什么
---

卷三走到最后一讲。前面七讲我们看的 `Agent`、`runLoop`、`StreamFn`、`ExecutionEnv`，全都是**内存里**的运行时——进程一关，对话就没了。但 pi 要当生产级 harness，必须"关掉再打开还能接着聊"。这一讲看 `pi-agent-core` 里那台"持久会话主机" `AgentHarness`，以及它背后记账的 `SessionState`、崩溃恢复的 `reduceLaneState`。

## 一、AgentHarness：跨进程的会话主机

`AgentHarness` 定义在 `harness/agent-harness.ts:305`：

```ts
export class AgentHarness implements AgentLane {
	readonly name = "main";                 // 默认只有一条名为 main 的 lane
	readonly session: SessionTree;
	readonly hooks: Hooks;
	readonly events: Events;
	private readonly durableSession: Session;   // ← 持久化的会话仓库
	private model: Model<Api>;
	// … 一堆可热更新的配置：thinkingLevel / activeToolNames / tools / streamOptions / retryPolicy …
}
```

**一句话定义**：`AgentHarness` 是"一个会话的常驻主机"——它把对话历史、配置、队列都绑在一个 `durableSession`（持久仓库，通常是 SQLite，见第 34 讲）上，使得哪怕进程崩溃，下一次 `create` 也能从仓库把会话原样拉起来。

注意它 `implements AgentLane`（`:305`）——`AgentLane` 接口（`:271` 起）定义了会话能做的事：`prompt`/`steer`/`followUp`/`compact`/`navigateTree`/`abort`/`watch`/`createLane`……几乎就是第 02 讲 `AgentSession` 在"产品层"做的那些事，搬到了"core 层"的持久化版本。

值得注意的诚实事实：在这个源文件里，`prompt`/`steer`/`compact` 等**操作方法都被实现成 `unavailable(...)`**，`unavailable` 会抛 `HarnessNotImplemented`（`agent-harness.ts:366`、`:374`、`:377` 等）。也就是说，**这个类本身是"骨架 + 类型契约 + 配置管理"**：真正驱动一轮运行的引擎（基于这套类型与 `SessionState` 记账）在别处实现，`AgentHarness` 在这里把"会话长什么样、能干什么、配置怎么存"钉死。我们这一讲就专看它钉死的这三样：会话账本、lane 模型、恢复 reducer。

## 二、SessionState：整段对话的记账本

`SessionState` 在 `harness/session/state.ts:50`，是一个纯内存但结构严谨的"会话账本"：

```ts
export class SessionState {
	private sequence = 0;                              // 全局单调递增序号
	private readonly usedIds = new Set<string>();
	private readonly entries: Entry[] = [];           // 所有消息/自定义条目
	private readonly entriesById = new Map<string, Entry>();
	private readonly records: LaneRecord[] = [];      // 操作/队列/用量等记录
	private readonly openOperationsByLane = new Map<string, Map<string, OperationStartedRecord>>();
	private readonly lanes = new Map<string, string | null>(["main", null]);  // lane → 当前叶节点 id
	private readonly log: LogItem[] = [];
	private readonly stats: SessionStats = { messageCount: 0, cachedTokens: 0, /* … */ };
	// …
}
```

三个核心表：

- **`entries`**：对话里每一条"内容"（用户消息、助手消息、`toolResult`、分支摘要、压缩摘要……）都作为一个 `Entry`，按 `seq` 入册。
- **`records`**：不是内容，而是"发生了什么事"——操作开始/结束、队列入队/取消、token 用量等。它们是恢复 reducer 的食粮。
- **`lanes`**：`Map<lane名, leafId>`（`:57`）。每条 lane 指向它当前最新条目的 `id`（"叶节点"）。这揭示了 pi 的会话是一棵**有分支的树**——`navigateTree` 能在树上跳来跳去，`lanes` 记录每条工作线停在哪个叶子。

写入只有一道门：`applyMutation`（`session/state.ts:97`）：

```ts
applyMutation(mutation: SessionMutation, invalid = invalidMutation): void {
	const seq = /* 从 mutation 取 seq */;
	if (seq !== this.sequence + 1) invalid(`has non-consecutive seq ${seq}`);  // 必须严格递增
	switch (mutation.kind) {
		case "entry":   /* 校验 id 唯一、parent 链正确、lane 存在 → 入册 */ break;
		case "record":  /* 操作/用量记录 → 维护 openOperationsByLane、累加 stats */ break;
		case "lane":    /* 移动某 lane 的 leafId */ break;
		case "fact":    /* 改会话名/标签 */ break;
	}
}
```

**为什么 `seq` 必须严格递增（`+1`）？** 因为这是"只追加的账本"——任何乱序或重复写入都被 `invalid()` 判为非法。配合 `parentId` 链校验（`:114`），`SessionState` 保证会话树既不会断、也不会有环（`walkToRoot`，`:315` 会查环）。这正是"崩溃后能从记录精确重建"的底层保证。

## 三、lane：会话内的并发工作线

**一句话定义**：`lane` 是"同一个会话里的一条并发工作线"。你可以把它想成一条会话分支上的独立进程——各自有自己的对话叶、各自的挂起队列、各自的运行中操作。`main` 是默认那条（`:306`），`createLane`/`lane`/`lanes`（`agent-harness.ts:444`、`:447`、`:450`）是管理多 lane 的契约。

为什么需要多条 lane？一个会话可以"同时"做几件事：主线在答用户，另一条 lane 在后台压缩上下文，或另一条在试探性分支。它们都是同一棵会话树上的不同工作线。`LaneInfo`（`:152`）记录每条线的名字、当前叶、以及"正在跑什么操作（run/compaction/navigation）"；`SessionSnapshot`（`:177`）则是把**所有 lane** 汇成一份顶层快照：

```ts
export interface SessionSnapshot {
	lanes: (LaneInfo & { suspended?: SuspendedOperation })[];
	faulted: boolean;
}
```

`SuspendedOperation`（`:140`）记录"这条线为什么挂起"——`crash`（进程崩了）或 `deferred`（等一个外部延迟句柄）。它是崩溃恢复的关键线索。

## 四、reduceLaneState：从记录推导"现在该干什么"

崩溃后怎么续上？pi 的答案很"函数式"：`reduceLaneState`（`harness/reducer.ts:506`）是**一个纯函数**——给定持久化下来的 `records`、`entries`、以及当前 `leafId`，它**无副作用地推导出某条 lane 此刻的编排状态**。

```ts
export function reduceLaneState(input: LaneReductionInput): LaneReductionResult {
	validateRecordLog(input);                                  // 先校验记录合法
	const records = bySequence(input.records);
	const ownEntries = bySequence(input.ownEntries);
	// 合并所有条目进 entriesById
	const cancelledQueueIds = new Set(records.filter(r => r.type === "queue_cancelled").map(r => r.entryId));
	const pendingQueueRecords = records.filter(/* queue_enqueued 且目标还没入册、没被取消 */);
	const started = input.openOperations[0];                   // 当前还在跑的操作
	// … 推导出 pendingSteer / pendingFollowUp / pendingNextRun / pendingWrites …
	if (!started) {
		return { laneState: { lane, leafId, operation: null, pendingNextRun }, /* … */ };  // 没在跑 → 仅剩队列
	}
	// 有在跑的操作 → 推导出挂起的 steer/followUp、未决写、缺的初始消息、当前 step …
}
```

它算出来的东西，正是 `runLoop` 在第 13 讲需要的所有"待办"：

- **`pendingSteer` / `pendingFollowUp` / `pendingNextRun`**：对应 `Agent` 的 `steeringQueue` / `followUpQueue`（第 12 讲）——只是这里从持久记录里复原，而不是内存队列。
- **`pendingWrites`**：操作期间"延迟写"还没落账的条目。
- **`step`**：当前进行到哪一步（普通助手回复 / 压缩 / 分支摘要），以及尝试了几次。

关键点：**reducer 不重跑历史**。它只读记录、做推导，得出"现在这条 lane 应该接着做什么"。崩溃恢复时，新进程用 `reduceLaneState` 算出 `pendingSteer` 等，然后接着 `runLoop` 往下走——对话无缝续上，且因为 `SessionState` 的 `seq` 严格递增（`:104`），绝不会重复或漏掉历史条目。

> **回到全卷**：第 12 讲 `Agent` 的 `steer`/`followUp` 是内存版；这一讲 `reduceLaneState` 是它"落到持久仓库后、崩溃也能复原"的同源概念。pi 把"同一时刻该处理哪些输入"这个关注点，从内存队列一路抽象到可恢复的纯函数 reducer——这就是 harness 比单纯 `Agent` 重一整层的原因。

## 试一试

打开 `packages/agent/src/harness`：

1. `session/state.ts:104` 的 `if (seq !== this.sequence + 1) invalid(...)`。如果有人尝试把一条 `seq` 比当前小 1 的 `entry` 写进 `SessionState`，会发生什么？这给"崩溃后重放记录"带来什么保证？
2. `agent-harness.ts:305` 的 `AgentHarness` 实现里，`prompt`/`steer`/`compact` 等方法体是什么（`:366` 起）？这说明本文件在 pi 架构里扮演"骨架/契约"还是"完整引擎"？真正的驱动逻辑大致会在哪一层（提示：`runLoop` 在 `agent-loop.ts`）。
3. `reducer.ts:506` 的 `reduceLaneState` 被声明为普通函数而非类方法。结合 `SessionState` 的纯数据，猜猜 pi 为什么把它做成"纯函数 + 输入记录"而不是"边跑边改状态"？

## 下一讲预告

卷三收官——我们走完了 pi 的"心脏"：`Agent` 状态、`runLoop` 双层循环、流式派发、工具执行、`StreamFn` 与 `ExecutionEnv` 两道接缝，以及持久会话主机。卷四（第 19 讲起）我们下到"手脚"：工具与扩展系统——`ExtensionAPI` 如何让你装上一个扩展，pi 就变成另一个产品。
