---
title: 第20讲·Agent 接口：智能体的操作面板
summary: 精读 core/agent/src/types.ts——send、followup、steer、inject、cancel，以及那个精妙的 inbox 收件箱。
objectives:
  - 读懂 Agent 句柄接口的每个方法的使用场景
  - 理解 AgentStatus 与 PreStepDecision 拦截机制
  - 明白"接口"与"实现"分离在这里的价值
tags: [deepseek-harness, agent, 接口设计]
keyPoints:
  - Agent 是对外句柄：send/followup/steer/inject/cancel 五个动作
  - inbox 收件箱让"插话"成为一等公民——运行中也能接收新输入
  - PreStepDecision 让插件有机会在每一步前拦截或放行
---

卷二我们认识了数据。卷三开始读"动词"——首先是 `core/agent/src/types.ts`，它定义了**外界能对一个智能体做什么**。

## Agent 是一个句柄，不是一堆函数

dsh 把智能体抽象为一个对象（句柄），外界通过它操作智能体。接口大致是（简化）：

```ts
interface Agent {
  readonly id: AgentId;
  readonly status: AgentStatus;        // 'idle' | 'running'
  send(input: UserMessage): void;      // 发起新输入
  followup(input: UserMessage): void;  // 排队追加（当前回合结束后处理）
  steer(input: UserMessage): void;     // 运行中"打方向"——立刻影响当前回合
  inject(message: UserMessage): void;  // 注入消息（不触发新回合）
  cancel(reason?: string): void;       // 取消当前运行
}
```

五个动词，各有场景：

| 动词 | 场景 | 类比 |
|---|---|---|
| `send` | 用户在输入框敲了句话 | 点单 |
| `followup` | 用户连着发了三条，希望按顺序处理 | 排队补单 |
| `steer` | 模型跑偏了，用户中途纠正"不对，我说的是 B 方案" | 副驾喊话 |
| `inject` | 系统在回合中塞入一条上下文（如定时提醒） | 递纸条 |
| `cancel` | 用户按了停止按钮 | 叫停 |

`steer` 和 `followup` 的区别值得咀嚼：steer 要**立刻**影响正在进行的思考，followup 是**下一轮**再说。实现这个差异的机制就是 inbox。

## inbox：智能体的收件箱

types.ts 里定义了 `InboxTarget`：

```ts
type InboxTarget = 'next-turn' | 'next-step';
```

inbox 是一个消息队列，每条排队消息带一个投递目标：

- `next-step`：当前回合的**下一步开始前**插入——这就是 steer 的实现基础。模型这一步还没开始想，你的纠正就能赶上趟；
- `next-turn`：**当前回合结束后**再开新回合处理——这是 followup。

类比：餐厅后厨的订单架。steer 是冲进后厨喊"那份别放香菜！"（厨师还没炒，来得及）；followup 是把新菜单挂到架子上（这单做完再做那个）。

## PreStepDecision：每一步前的"安检口"

types.ts 还定义了拦截决策：

```ts
type PreStepDecision =
  | { kind: 'reject' }                      // 拒绝这一步
  | { kind: 'enter'; messages: UserMessage[] }; // 放行，可附带额外消息
```

agent-loop 在每个 step 开始前会询问所有监听者："这一步可以开始吗？"任何插件可以返回 reject 把它拦下来（比如检测到敏感操作），或返回 enter 并**夹带私货**——额外塞几条消息给模型看。审批系统、权限检查、上下文注入，都挂在这个口子上。

## 为什么接口与实现要分开

`core/agent` 包里几乎只有类型，没有逻辑。真正的循环驱动器在 `core/agent-loop`（下一讲的 516 行大文件）。为什么分开？

因为"智能体应该能做什么"（接口）和"怎么做到"（实现）是两个变化速度完全不同的东西。接口稳定，实现可以重写——事实上 dsh 的循环驱动器本身也是可替换的插件（还记得吗，连主循环都是插件）。读代码时先读接口，等于先看目录再看正文。

## 试一试

打开 `packages/core/agent/src/types.ts`，找到 `Agent` 接口，对照本讲的表格核对五个动词。再找找 `AgentStatus`——它只有两个值，想想：为什么不需要 'paused'（暂停中）这个状态？（提示：想想 inbox 和 cancel 已经覆盖了哪些场景。）

## 下一讲预告

面板有了，该看发动机了。下一讲精读全仓库最核心的文件：`core/agent-loop/src/agent.ts`，516 行，一次对话的全部调度逻辑都在里面。我们会分段啃完它。
