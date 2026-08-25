---
title: 第17讲·Inbox：双队列收件箱与唤醒的艺术
summary: 精读 Inbox 类：next-turn/next-step 双队列、splice 的持久投影、claim 领取语义与取消清理顺序。
objectives:
  - 画出双队列的结构并说出两类输入各自的路由规则
  - 解释 agent/inbox/spliced 为什么要持久化
  - 掌握 cancel 时"先清 next-step 再清 next-turn"的顺序理由
tags: [deepseek-harness, inbox, 并发]
keyPoints:
  - 收件箱是两条有序队列：next-turn（新轮次输入）与 next-step（转向/注入）
  - 每次变更广播 agent/inbox/spliced 并持久化——重启后待办不丢
  - claim = 从队首取走：next-step 全领，next-turn 只领一条当本轮主角
  - 清空队列先 next-step 后 next-turn，保证同步观察者看到一致的删除次序
---

卷三收官。主循环、接口、提示词、压缩都讲过了，还剩一个默默无闻却无处不在的角色：**Inbox**。它是第 12 讲 Agent 接口里五个动词的目的地，是 preStep 领取输入的仓库，也是 steer/inject/followup 三兄弟语义差异的物质载体。220 行的类，值得单独一讲。

## 一、结构：两条队列，两种命运

`packages/core/agent/src/inbox.ts` 第 25 行：

```ts
export class Inbox {
  private readonly state: InboxState = { 'next-turn': [], 'next-step': [] }
}
```

就两条有序列表，但路由规则决定了整个智能体的交互模型：

| 队列 | 谁往里放 | 何时消费 | 语义 |
|---|---|---|---|
| `next-turn` | followup() | 下一个 turn 开头 | "一条全新的用户消息"，独占一个新轮次 |
| `next-step` | steer() / inject() / 工具结果上下文 | 下一个 step 边界 | "给进行中工作的插话与补给" |

回忆第 20 讲的类比：followup 是重新导航，steer 是副驾驶喊话，inject 是塞纸条但不说话。现在你能看到它们的物理实现——**三个动词只是 send(message, target, wakeup) 的便捷封装**：target 决定进哪条队列，wakeup 决定是否点火。

## 二、每次变更都是一条持久事件

Inbox 构造时接收三个回调（inserted/discarded/claimed），在 agent.ts 里被接到 `agent/inbox/*` 实时事件上。但还有一条更重的通道——第 05 讲词汇表里那个由 core/agent 通过声明合并追加进 SessionEventMap 的事件：

```ts
'agent/inbox/spliced': {
  target: InboxTarget       // 动了哪条队列
  start: number             // 起点
  removedCount?: number     // 删了几条
  inserted: UserMessage[]   // 插入了什么
  outcome?: 'canceled'      // 被取消标记的收尾
}
```

注释里有一句关键设计："Live dispatch precedes projection mutation, so synchronous observers may read the pre-splice inbox to recover the removed messages"——**先广播实时事件、再改动投影**，这样同步监听者还能读到变更前的完整队列。顺序反了，观察者就只能看到残骸。

为什么收件箱要持久化？想想这个场景：你给智能体排了三个任务（三条 next-turn），进程崩了。重启后如果收件箱是纯内存的，任务全丢；有了 spliced 事件流，重启时重放这些事件即可重建队列——**待办工作和对话历史享受同样的断电保护**。这是"一切皆日志"哲学的最后一块拼图。

## 三、claim：领取的精确语义

preStep 每步开头调用的 claim 方法（inbox.ts:72）：

```ts
const claimed = this.mutate('next-step', 0, this.nextStep.length, [], false)
if (target === 'next-turn') {
  claimed.push(...this.mutate('next-turn', 0, 1, [], false))
}
```

读出三层含义：

1. **next-step 全清空**：所有等待的转向和注入一次性并入本步骤；
2. **next-turn 只领一条**：即使队列里排着五条新消息，本轮只取第一条当主角——剩下的留给后续轮次。这保证了每条用户消息都能得到"以它为中心"的一轮，而不是被合并成一锅粥；
3. **领取即出队 + 发 claimed 事件**：消息从"待处理"变成"已进入历史"（下一步就以 user/message 落账），全程留痕。

配合第 02 讲流程图那句注释："有些消息会立即唤醒它；注入的上下文会留在 inbox 中，直到另一条消息将其唤醒"——现在你知道了它的机制本质：inject 的 wakeup=false 让驱动器继续睡，消息静静躺在 next-step 里，直到某天一条带 wake 的消息触发轮次，claim 把它捎带上车。

## 四、cancel 与 clear：撤退也有纪律

取消一个活动中的轮次时（Agent.cancel），默认会清空收件箱。clear 的实现藏着顺序讲究：

```ts
/** Durably cancel all pending input, clearing next-step before next-turn. */
clear(): void {
  this.splice('next-step', 0, this.nextStep.length, [])
  this.splice('next-turn', 0, this.nextTurn.length, [])
}
```

为什么先 next-step？因为两条队列在因果上有层级：next-step 是"当前工作流内的插话"，next-turn 是"未来的独立任务"。撤退时先撤内部补充、再撤未来计划——如果反过来，观察者会短暂看到一个荒谬状态："未来任务没了，但当前任务的插话还在"。**销毁顺序要与其依赖顺序相反**，和构造顺序互为镜像——资源管理的通用律（C++ 的析构顺序、栈的回退都是它）。

另外注意 send() 里那个精妙的防御（agent.ts）：唤醒消息插入前先捕获"wakingAfterAbort"状态——"Captured before the insertion so a reentrant cancel from a splice observer cannot reclassify it"。因为插入动作本身会触发 spliced 事件，而某个监听事件的插件可能在事件处理里递归调用 cancel 改变 abort 状态！先拍快照再做操作，防止重入污染判断。并发编程的 paranoia，处处可见。

> 💡 **知识拓展：生产者-消费者与"检查-行动"竞态**
> Inbox 是标准的生产者-消费者队列，但它有两个特殊约束：消费者是单线程循环（不会双消费）、且队列状态要持久化。后者引入经典难题：内存改了、日志没写之间崩溃怎么办？dsh 的答案是让持久事件成为唯一事实源（内存队列只是它的投影）。凡是"内存状态 + 持久记录"成对出现的系统，都要选一边当真相——选错边，崩溃恢复就是 bug 工厂。

## 卷三总结 · 卷四预告

六讲走完心脏手术：Agent 五动词（12）、相位机与关卡（13）、请求与调度（14）、世界观组装（15）、记忆减肥（16）、收件箱（17）。至此，一条消息从进门到出门的全部主干代码你都读过了。

下一卷转向手脚：光会思考不够，智能体得能真正干活。卷四第一讲拆工具注册表——defineTool 的接口契约、schema 如何生成、以及"作用域化注册"如何让不同智能体拥有不同的工具箱。
