---
title: 第02讲·一次 turn 的真实生命周期
summary: 打开真实源码 agent.ts，照 Phase 状态机、kick/turn/preStep 主循环，逐行走完一条消息从回车到回复的一生。
objectives:
  - 用真实类型定义区分 step 与 turn，说清各自的开关时机
  - 顺着 agent.ts 的 turn() 主循环，讲清开边界、preStep 瀑布、step 循环、turn/end 的因果关系
  - 解释"先写日志再做事"与"空首轮不花模型调用"两条工程铁律
tags: [deepseek-harness, turn, agent-loop, 源码精读]
keyPoints:
  - step = 一次模型请求 + 它调用的工具；turn = 零或多个 step，领取首条输入前打开、不再欠活时关闭
  - Phase 是判别联合类型 idle|maintenance|running，非法状态在类型层面无法表达
  - turn() 先 append('turn/start') 落盘再干活；preStep 瀑布决定"模型看到什么"，被拒/改空的首次领取仍关一个零 step 的 turn
  - 持久会话事件（turn/*、step/*、user/message、assistant/*、tool/*）是真相，agent/* 是运行中的活控制
---

上一讲我们拿到了全景地图。这一讲不再"纸上谈兵"——直接打开真实源码 `packages/core/agent-loop/src/agent.ts`，照着主循环走完一条消息的一生。看懂这一讲，后面所有讲次的零件你都知道该装回流程的哪个位置。

先记住两个贯穿全系列的时间单位，定义来自官方 `docs/architecture.md`：

> **A step is one model request plus the tools it calls. A turn is zero or more steps: it opens before its first input is claimed and closes once nothing is owed.**

翻译并落地：**step（步骤）= 一次模型请求 + 这次请求触发的所有工具调用**；**turn（轮）= 零个或多个 step 组成的一个完整工作单元**，它在领取首条用户输入之前打开，在"不再欠任何工作"时关闭。

为什么分两级？因为一个真实任务很少一步到位。"看看仓库结构"可能是：step1 调 `ls` → step2 读 README → step3 组织语言回答。这三个 step 属于同一个 turn——**turn 是"办一件事"，step 是"其中一轮思考加动作"**。耐人寻味的是：turn 可以包含**零个** step（见下文"空首轮"）。

## 一、Phase：用判别联合锁死状态

主循环的一切行为由一个 `phase` 字段驱动。这是 `agent.ts` 第 38–46 行的真实定义：

```ts
type Phase =
  | { kind: 'idle'; lastTurn: number }
  | {
    kind: 'maintenance'
    abort: AbortController
    lastTurn: number
    wakeRequested: boolean
  }
  | { kind: 'running'; abort: AbortController; turn: number; step: number; wakeRequested: boolean }
```

三个要点，都是真代码告诉我们的：

1. **每个非 idle 相位自带一个 `AbortController`**——取消就是调它的 `abort(cause)`，信号会贯穿后续所有异步操作（源码里 `signal.throwIfAborted()` 散布在循环各处）；
2. **`wakeRequested` 是"唤醒闩锁"**：运行或维护期间来了唤醒请求无法立刻处理，就闩住；相位收敛回 idle 时检查闩锁，有待办且有排队消息就再次点火（见下面 `kick()` 的 finally）；
3. **一切迁移走 `setPhase()`**（第 104–111 行）：

```ts
private setPhase(next: Phase): void {
  const previousStatus = this.status
  this.phase = next
  const status = this.status
  if (status !== previousStatus) {
    this.dispatch.emit('agent/status', { status })  // 对外广播状态变化
  }
}
```

注意 `setPhase` 只对比迁移前后的对外 `status`（idle/running 二值），变化时通过 `agent/status` 事件广播——UI 的"对方正在输入…"指示灯就是这么亮的。

> **知识拓展：为什么用判别联合（discriminated union）而不是几个布尔位？**
> 三种相位互斥且各有专属字段（maintenance 才有 `abort` 与 `wakeRequested`，running 才有 `turn`/`step`）。若用布尔组合（`isRunning`、`isMaintenance`…），会出现"maintenance 且 running"这种非法状态的容身之处。**让非法状态无法被表达**，是类型系统给状态机的第一份礼物。AGENTS.md 还写明一条对应纪律：封闭联合（closed union）的终结处用 `assertNever` 收口——编译器替你保证以后加新相位时，所有 `switch` 分支都被迫处理它。这是本系列反复会遇到的"类型即文档"范式。

## 二、点火：wakeDriver 与 kick

外部调用 `send(message, target, wakeup=true)` 后，谁把循环转起来？`wakeDriver` 先判断当前是否在 idle：不在 idle 就按规则闩锁唤醒请求；在 idle 才创建 running 相位并启动 `kick()`。而 `kick()` 出人意料地短（第 210–223 行，真实代码）：

```ts
private async kick(): Promise<void> {
  try {
    while (await this.turn()) {}   // turn 返回 true 就继续转，false 就彻底没活
  } catch (_error) {
    // Reported failures and cancellation are contained at the driver boundary.
  } finally {
    if (this.phase.kind === 'running') {
      const { turn, wakeRequested } = this.phase
      this.setPhase({ kind: 'idle', lastTurn: turn })
      if (wakeRequested && this.inbox.hasPending) this.wakeDriver()  // 放行闩锁
    }
  }
}
```

`while (await this.turn()) {}`——**循环的骨架只有一句 while**，所有复杂度都被推入 `turn()` 内部。两个细节值得学：

- **错误处理上移**：`catch` 里什么都不做不是偷懒，而是因为每个错误已经在自己的活动边界上通过 `throwError` 广播过 `agent/error` 了（见 `turn()` 末尾）。**上报与传播分离**，避免同一错误被层层重复报告。
- **闩锁放行**：finally 里若 `wakeRequested` 为真且收件箱还有待处理消息，就再次 `wakeDriver()`——把"维护/运行期间被推迟的唤醒"补上。

## 三、turn()：开边界 → preStep 瀑布 → step 循环 → 落盘

`turn()`（第 246 行起）承担一个轮次的完整生命周期。下面给出保留真实控制流的骨架，省略内部错误分支以便聚焦主路径：

```ts
private async turn(): Promise<boolean> {
  const phase = this.phase
  const { signal } = phase.abort
  signal.throwIfAborted()
  const turn = phase.turn + 1
  try {
    this.session.append('turn/start', { turn })   // ① 先落盘再干活
  } catch (error: unknown) {
    this.throwError(error)
  }
  phase.turn = turn
  let turnEnds: TurnEndReason | null = null
  let target: InboxTarget = 'next-turn'
  try {
    while (true) {
      signal.throwIfAborted()
      const step = phase.step + 1
      const decision = await this.preStep(target, { turn, step })  // ② 过关卡
      if (decision.kind === 'reject') {
        turnEnds = { kind: 'blocked' }
        return false
      }
      if (turnEnds && decision.messages.length === 0) break
      // 被移除的唤醒消息、或被改写为空的 enter，仍拥有初始 turn 边界，但不花模型调用
      if (phase.step === 0 && decision.messages.length === 0) {
        turnEnds = { kind: 'completed' }
        return false
      }
      signal.throwIfAborted()
      this.session.append('step/start', { turn, step })   // ③ step 起点
      phase.step = step
      try {
        for (const message of decision.messages) {
          this.session.append('user/message', message, { surfaceOp: 'append' })  // ④ 输入入账
        }
        const stepEnd = await this.step(decision.assembly)   // ⑤ 真正的生产环节（下一讲边界）
        if (turnEnds === null || turnEnds.kind !== 'max-tokens') turnEnds = stepEnd
      } finally {
        this.session.append('step/end', { turn, step })   // ⑥ 对称收尾
      }
      signal.throwIfAborted()
      if (turnEnds && this.inbox.nextStep.length === 0) {
        await this.dispatch.serial('agent/turn-stopping', { turn, signal })  // ⑦ 收尾裁决
        signal.throwIfAborted()
      }
      if (turnEnds && this.inbox.nextStep.length === 0) break
      target = 'next-step'
    }
  } finally {
    this.session.append('turn/end', { turn, reason: turnEnds! })   // ⑧ 轮次落盘
  }
  if (!this.inbox.hasPending) return false
  phase.abort = new AbortController()   // 换新控制器，让旧闩锁失效
  phase.wakeRequested = false
  phase.step = 0
  return true   // 队列还有活，开下一轮
}
```

五个看点，全部由真实代码支撑：

**① 先写日志再做事。** `turn/start` 落盘成功才继续——若 `append` 失败（存储坏了），直接 `throwError` 终止。顺序不能反：先干活后记账，崩溃时会留下"做了事却无账可查"的黑洞。这条原则在 `docs/architecture.md` 被写成铁律：**"Model-visible means logged"**——任何发给模型的内容都必须能从日志重建。

**② ④ 合起来是本讲的题眼——空首轮。** 首次领取被插件拒绝（blocked），或被改写成空消息集时，代码仍走完 `turn/start`…`turn/end` 的完整闭环，只是不启动任何 step、不发任何模型请求。用户发了条消息却被策略拦下，这件事本身是必须留痕的事实——UI 要显示"被拦截"，审计要能复盘。**边界属于历史，代价为零；内容才花钱。**

**⑤ max-tokens 的粘性**：某一步因输出超限戛然而止后，哪怕后面重试的步骤正常完成，轮次最终定性仍是 `max-tokens`——不许"后来者洗白"。一个小业务规则，写出了对因果诚实的态度。

**⑦ `turn-stopping` 只在真正收尾时触发**：轮次要结束、且 `next-step` 队列已空——这个串行事件给插件最后一次发言权（它走 `serial` 模式，没有 `next()`，见下一讲）。注意 `break` 前还查了一次队列：万一监听者在 stopping 期间又塞了转向消息，轮次就得继续。

## 四、preStep：决定"模型看到什么"的瀑布关卡

每一步的起点是 `preStep`（第 225 行，真实代码）：

```ts
private async preStep(target: InboxTarget, position: { turn: number; step: number }): Promise<PreparedStep> {
  const signal = this.phase.abort.signal
  const claimed = this.inbox.claim(target, position.turn)              // ① 领取输入
  const assembly = await this.loopCtx.systemPrompt.assemble(...)        // ② 组装提示词
  const context = this.runtimeContext.project(...)                     // ③ 投影注入上下文
  const decision = await this.dispatch.waterfall(                       // ④ 瀑布裁决
    'agent/pre-step', { messages: claimed, ...position, signal },
    (): Promise<PreStepDecision> => Promise.resolve<PreStepDecision>({
      kind: 'enter',
      messages: context === undefined ? claimed : [...claimed, context],
    }),
  )
  return decision.kind === 'reject' ? decision : { ...decision, assembly }
}
```

① 从收件箱领取目标队列的消息（领取即出队，配合 `inbox/claimed` 事件全程留痕）；② 向 `system-prompt` 服务要一份 `PromptAssembly`（片段 + 工具清单，第 15 讲细讲）；④ 把决定权交给 `agent/pre-step` 的 waterfall 监听链：默认决策是放行（`enter`），途中任何插件可以往消息列表追加注入上下文、改写内容，或干脆 `reject`。

> **知识拓展：waterfall 是什么？这里先建立直觉**
> 第 ④ 行的 `dispatch.waterfall('agent/pre-step', payload, defaultAction)` 是 Cordis 的"瀑布式事件"——监听者排成一列，每人收到事件和一个 `next()` 函数，处理完必须调 `next()` 把接力棒传下去；不调就短路（否决）。权限插件短路 = 拒绝；上下文插件加工 = 包装后委托。一个函数，两种扩展范式同台演出。**它的完整机制、四种事件派发模式、为什么监听器必须调 `next()`，下一讲（第 03 讲）专门拆。** 现在你只需记住：第 02 讲里到处出现的 `ctx.*` 和 `waterfall`，统统来自 Cordis。

## 五、事件日志才是真相

把上面散落的 `append(...)` 串起来，你会发现 `turn/start`、`step/start`、`user/message`、`step/end`、`turn/end`、`assistant/chunk`、`tool/*` 全写进同一个 `session` 日志。依 `docs/architecture.md`，事件分三个域，用途截然不同：

| 域 | 例子 | 寿命 | 用途 |
|---|---|---|---|
| **会话事件** | `user/message`、`assistant/message`、`tool/result`、`turn/*`、`step/*` | 持久化到磁盘 | "发生过什么"的事实，重启后可回放 |
| **Agent 事件** | `agent/pre-step`、`agent/request`、`agent/turn-stopping` | 只存在于运行中 | 观察、拦截、改写进行中的工作 |
| **能力事件** | `fs/*`、`tools/*`、`telemetry/*` | 只存在于运行中 | 给某项能力附加策略或适配器 |

判断标准一句话：**这个事实需要在重新加载后依然存在吗？** 需要，就做成会话事件（持久）；只是想实时插手，就用 agent 或能力事件（临时）。`agent/*` 是运行中的活控制面，`session/event` 才是可回放的真相源——SDK 要拿转录数据，消费 `session/event` 即可。

## 试一试

打开 `agent.ts`，找到 `whenIdle()`（第 195 行，真实代码只有 6 行）：

```ts
async whenIdle(): Promise<void> {
  let activity: Promise<void>
  do {
    await (activity = this.activityDone)
  } while (activity !== this.activityDone)
}
```

想一个问题：它为什么用 `do…while` 反复 `await activityDone`，而不是只等一次？提示：考虑"等待期间恰好有新工作被点火"的场景——如果只 `await` 一次旧 Promise，而那次 Promise 已 resolve、新的活动又开始了，会发生什么？把你的回答写成一句话注释，贴到这个函数上方。

## 下一讲预告

这一讲每一行都出现了 `ctx.*`、`dispatch`、`waterfall`，但还没解释它们到底是什么。下一讲我们正式钻进 Cordis 插件框架：Context 服务容器、插件的五个核心观念、四种事件派发模式、waterfall 的洋葱语义，以及 TypeScript 声明合并如何撑起整套类型化事件系统。
