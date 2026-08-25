---
title: 第12讲·Agent 接口：五个动词撑起一个智能体
summary: 精读 Agent 接口的完整定义与 ReactLoopAgent 的构造过程，理解"接口与实现分离"的深意。
objectives:
  - 背下 Agent 接口的全部成员并按"属性/动词/查询"分类
  - 说清 followup、steer、inject 三个入口的语义差异
  - 理解为什么主循环可以整体被替换而系统无感
tags: [deepseek-harness, agent, 接口设计]
keyPoints:
  - Agent 接口的写入口只有五个动词：send / followup / steer / inject / cancel
  - 接口（core/agent）与实现（core/agent-loop 的 ReactLoopAgent）分属两个包
  - 每个 Agent 自带一块 agent 作用域的 ctx——注册随智能体生灭，互不串台
  - agent/* 事件携带活跃 Agent 实例，是观察和拦截进行中工作的统一入口
---

卷三开篇。地基卷我们搞清楚了"记忆"怎么存（session），这一卷要搞清楚"大脑"怎么转——**驱动一个会话的 Agent 到底是什么**。答案会让你惊讶它的克制：整个智能体对外暴露的写入口只有**五个动词**。

## 一、先看定义：接口长什么样

`packages/core/agent/src/runtime-types.ts` 第 64 行起：

```ts
export interface Agent {
  readonly id: SessionId          // 与 session 共享的唯一身份
  readonly options: AgentOptions  // 提供商路由与模型
  readonly session: Session       // 驱动的活会话；日志是持久事实之源
  readonly inbox: Inbox           // 待处理工作的持久投影
  readonly status: AgentStatus    // 生命周期状态，每次变化镜像到 agent/status
  readonly ctx: Context           // agent 私有上下文

  cancel(cause, options?)   // 取消活动工作
  whenIdle()                // 等"全静默"
  runMaintenance(task)      // 从真正的空闲态跑一次维护任务
  send(message, target, wakeup)   // 总入口：路由输入 + 可选唤醒
  followup(message)         // 追加一整个普通轮次
  steer(message)            // 就近的步骤边界插入转向指令
  inject(message)           // 注入模型可见上下文，但不唤醒
}
```

五个动词里藏着三个精妙的语义差：

- **`followup`**：排队到 `next-turn` 并唤醒——它是"一条全新的用户消息"，会成为下一个轮次的主角；
- **`steer`**：排队到 `next-step` 并唤醒——它不新开轮次，而是在当前轮次的**下一个步骤边界**插进来。类比开车：followup 是重新导航去新目的地，steer 是副驾驶喊一句"前面路口左转"。运行中的循环在两个 step 之间检查收件箱，把转向消息并入下一步的输入；
- **`inject`**：同样排到 `next-step`，但 **wakeup=false——只投递，不唤醒**。空闲的智能体收到注入后继续睡觉，直到某条真消息把它叫醒，注入才搭上那班车。这正是第 02 讲流程图注释"有些消息留在 inbox 中，直到另一条消息将其唤醒"的出处。文件变更通知、子目录 AGENTS.md 这类环境上下文都用它——它们是背景知识，不该凭空触发一轮昂贵的模型调用。

还有 `cancel(cause, options)` 的细节：cause 是结构化的取消原因（user / parent / hook / disposed 四种），options.keepInbox 可以保住队列里的活。以及 `runMaintenance`：压缩这类"家务活"不从 turn 里跑，而是从真正的 idle 相位跑——期间公开状态保持 idle，唤醒请求会被闩住等任务结束再放行。

## 二、接口与实现：故意分家的两兄弟

注意包的划分：接口住在 `core/agent`，唯一的官方实现 `ReactLoopAgent` 却住在隔壁的 `core/agent-loop/src/agent.ts`。为什么要分家？

因为**契约和策略是两种变化节奏**。接口（有哪些动词、什么语义）是全系统的公约数——工具系统、UI、子代理调度都依赖它，一年也未必变一次；而实现（循环怎么调度、错误怎么重试）是最激进的产品策略，DeepSeek 自己也在快速迭代。分家之后：

- 消费方只 import 接口，永远不知道 ReactLoopAgent 的存在；
- 想换一种驱动方式？写个新类实现 Agent 接口，往配置树上一挂即可——还记得第 03 讲的归属表吗？"添加模型提供方→ctx.llm 注册适配器"，同理"添加驱动器→替换 ctx.agentLoop"；
- 测试时可以用一个假实现替身，秒级验证依赖 Agent 的其他组件。

类名 ReactLoopAgent 本身也是个宣言：这个默认实现是 ReAct 循环（第 02 讲的知识拓展）的忠实演绎。

## 三、构造函数：一台发动机的装配线

读源码先读构造函数——它在 30 行内完成了智能体的全部接线：

```ts
constructor(
  private loopCtx: Context,
  public readonly id: SessionId,
  public readonly options: AgentOptions,
  public readonly session: Session,
) {
  // ① 构建融合派发器：热路径上的事件派发零分配
  this.dispatch = agentEvents(loopCtx, this)
  // ② 收件箱上线，三个动作各发一条事件
  this.inbox = new Inbox(session, {
    inserted: m => this.dispatch.emit('agent/inbox/inserted', { message: m }),
    discarded: m => this.dispatch.emit('agent/inbox/discarded', { message: m }),
    claimed: (m, turn) => this.dispatch.emit('agent/inbox/claimed', { message: m, turn }),
  })
  // ③ 从日志恢复"上次转到第几轮"——重启无缝续跑
  const lastTurn = session.events.findLast(e => e.type === 'turn/start')?.data.turn ?? 0
  this.phase = { kind: 'idle', lastTurn }
  // ④ 开一块 agent 私有的作用域（第 11 讲的原语在此服役）
  this.scope = createScope(loopCtx, this)
  this.ctx = this.scope.ctx.extend({ agent: this })
}
```

四处接线，处处呼应前文：②的收件箱事件让外部能观察每条消息的入队与领取；③体现仅追加日志的红利——**新构造的实例从日志末尾自然接续**，不需要任何恢复仪式；④兑现 scope 的承诺：这块 ctx 上挂的一切注册（比如本 agent 的私有提示词片段）都随 agent 销毁而自动拆除，且销毁后拒绝再注册。

## 四、agent/* 事件域

第 02 讲说过事件三域，现在正式认识第二域。`core/agent` 声明了一族以 agent 为前缀的事件：`agent/status`（状态迁移）、`agent/inbox/*`（收件箱三动作）、`agent/pre-step`、`agent/request`、`agent/request-error`、`agent/turn-stopping`、`agent/error`……它们的共同特点：**载荷里带着活跃的 Agent 实例本身**。

这就是 UI 能实时渲染进度、审批插件能拦下危险调用、子代理调度器能掌握全局的原因——它们都在监听这一族事件。而其中最关键的三个瀑布（pre-step / request / request-error）将在接下来两讲的主循环精读中逐个登场。

> 💡 **知识拓展："小接口"哲学**
> Agent 接口只有约十个成员，却支撑了整个产品。对比一些框架动辄几十个钩子的"全能对象"，小接口的好处是：实现者负担小（换个驱动器不用填一百个空）、语义清晰（每个动词一句话说得清）、演进安全（成员越少，破坏性变更越少）。判断接口好坏的一个土办法：数数你能不能用一段话讲完它的全部动词——Agent 接口能，这就及格了。

## 试一试

打开 `packages/core/agent/src/runtime-types.ts` 通读 Agent 接口全文，找到 steer 注释里"A rejected step leaves steering parked in the inbox until the next wake"这句——结合本讲三个动词的语义差异，用你自己的话解释：一条被 pre-step 拒绝过的转向消息，最后会怎样？

## 下一讲预告

接口看完了，该看发动机点火。下一讲进入 ReactLoopAgent 内部：三种相位的状态机、kick 驱动循环、以及 turn 打开时那个决定一切的 preStep——515 行主循环的上半场。
