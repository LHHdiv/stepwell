---
title: 第13讲·deriveMessages：从日志投影出模型视野
summary: 精读表层（surface）机制与投影函数：13 种事件如何筛成 3 种、replace 如何改判历史、缓存如何做到 O(新增量)。
objectives:
  - 解释 surface 的 append/replace 两种入场方式及各自的使用场景
  - 逐段读懂 deriveMessages 的缓存与冻结策略
  - 理解"模型可见即已记录"如何被运行时不变量强制执行
tags: [deepseek-harness, deriveMessages, 投影]
keyPoints:
  - 只有 user/message、assistant/message、tool/result 三种事件有资格进入模型视野
  - 表层节点带 surfaceOp 标记：append 追加，replace 带区间改判——压缩就靠它
  - deriveMessages 增量缓存：每个节点只投影一次，返回浅拷贝数组但共享深度冻结的消息
  - agent-loop 的运行时不变量断言"发给模型的历史 ≡ 从日志推导的历史"
---

第 11 讲的词汇表里有个刺眼的对比：日志记了 13 种事件，模型却只该看到其中一小部分。chunk 要过滤掉、边界标记要过滤掉、todo 快照要过滤掉……这个"从完整日志中提炼出模型所见"的过程，就是本讲的主角——**投影（projection）**。它是 dsh 世界观的落点：**模型可见即已记录**（What the model sees is what was logged）。

## 一、表层：三个幸运儿与两种入场券

先认识中间层。`core/session/src/surface.ts` 开宗明义：

> 日志之上的表层（surface）：一个由"产生 LLM 消息的事件"构成的有序视图。仅追加的日志仍是事实之源。

有资格上表层的类型只有三个，源码里写死成一个 Set：

```ts
const SURFACE_EVENT_TYPES = new Set<string>([
  'user/message',       // 用户说的话 / 注入的上下文
  'assistant/message',  // 助手的完整回复（chunk 无资格）
  'tool/result',        // 工具结果
])
```

为什么是这三个？因为它们恰好对应对话的三种角色轮转——用户说、助手答、工具报。而 `assistant/chunk` 被排除的原因值得体会：chunk 是 message 的"草稿过程"，把两者都放进模型历史等于同一句话出现两遍。

但光筛选还不够，还有**改判**的需求：上下文压缩发生时（第 24 讲），旧的一批消息要被摘要替换掉——在不可修改的日志上怎么表达"这几条作废"？答案是每个表层事件携带一张**入场券**（SurfaceOp）：

```ts
export type SurfaceOp =
  | 'append'                                  // 正常路径：追加到队尾
  | { op: 'replace'; start: number; end: number }  // 改判：替换 [start, end] 区间的既有节点
```

`append` 是绝大多数事件的命运；`replace` 则是压缩专用的"改判书"——新节点入场时声明"我把第 X 到第 Y 号旧节点顶掉了"，且必须用 `sourceEventSeqs` 列出它引用的全部来源 seq。注意妙处：**旧节点没有被动过一根汗毛**，它们还在日志里；只是表层视图不再显示它们。"历史不可改，但解读可以更新"。

源码还区分了两个守卫函数，藏着一个人文关怀：

- `isAppendSurfaceEvent`：追加型事件——**人类阅读记录（transcript）只用这类**；
- `isReplacementSurfaceEvent`：改判型事件——只进模型视野。

为什么给人类的记录要排除改判？注释写道：一次已落地的 replace 会"抹掉用户已经看过的对话"。你亲眼看过的话不该从你的屏幕上消失，哪怕模型那边已经换了摘要版。**同一个日志，模型和人类各看各的投影**——这是对"日志是唯一事实，视角各有立场"最生动的诠释。

## 二、deriveMessages：逐行精读

现在看主角。`core/session/src/index.ts` 第 726 行起（约 30 行，我加了中文注解）：

```ts
private derived: Message[] = []     // 缓存：已冻结的投影结果
private derivedNodes = 0            // 缓存已覆盖到第几个表层节点
private derivedGeneration = 0       // 缓存构建时的"改判代数"

deriveMessages(): Message[] {
  const surface = this.surface
  const nodes = surface.nodes
  const generation = surface.replaceGeneration
  if (generation !== this.derivedGeneration) {
    // 发生过 replace：整代缓存作废，从头重建
    this.derived = []; this.derivedNodes = 0; this.derivedGeneration = generation
  }
  for (const seq of nodes.slice(this.derivedNodes)) {   // 只处理没见过的增量
    const msg = this.deriveEventMessage(this.log[seq]!)
    // 空内容的 assistant/message（只为承载 token 用量存在）投影为 null，不进历史
    if (msg) this.derived.push(msg)
  }
  this.derivedNodes = nodes.length
  return [...this.derived]   // 返回浅拷贝快照
}
```

四个设计决策，一个比一个讲究：

**① 增量缓存，O(新增量) 成本。** 这个函数在每次模型请求前都会被调用（主循环组装请求时）。如果每次都全量遍历几千个节点就太奢侈了。方案：记住"上次投影到哪了"（derivedNodes），本次只处理新增的尾巴。日常调用几乎零成本。

**② 代数（generation）检测改判。** 一旦发生 replace，"上次到哪了"的坐标全部失真，所以表层维护一个 replaceGeneration 计数器，每次改判自增；缓存发现代数变了就整体重建。压缩不常见，重建偶发的代价完全可接受。**用一代计数器换"增量快路径 + 全量慢路径"的双轨制**。

**③ 返回浅拷贝，但消息对象深度冻结。** 注释强调了两件事：返回的数组是 fresh snapshot——调用方拿着它，之后的新增不会偷偷长进去（避免诡异的共享可变）；但数组里的 Message 对象是**共享且 Object.freeze 过的**——反正事件数据本来就不可变，直接复用连深拷贝都省了，消费者也绝无可能篡改日志内容。**对外像值传递，内部零拷贝**——不可变性不是性能敌人，而是盟友。

**④ 单点投影规则。** 每个节点变成什么消息，由纯函数 `deriveEventMessage` 决定（surface.ts 里那句大写的 "THE per-node projection rule"）。关键在于：外部工具（如 session-query 的回放验证）fold 的是**同一个函数**——保证任何人在任何时候重建出的历史与当时发给模型的逐字节一致。

## 三、"模型可见即已记录"的执法官

原则喊得响，谁来执法？答案在 `core/agent-loop/src/invariant.ts` 第 39 行附近：

```ts
// 断言：即将发出的消息序列 ≡ 会话日志推导出的历史
const expected = session.deriveMessages()
```

主循环在每次请求前做这个断言：如果有人绕过日志塞了私货给模型（比如直接改内存里的消息数组），不变量当场爆炸，进程拒绝继续。这就是第 02 讲那条铁律的实现形态——**不是靠 code review 自觉，而是靠运行时断言强制**。dsh 有整套 invariants 体系（每包配一个 invariant companion，第 10 讲见过它的注册仪式），把架构原则翻译成机器可查的规则。

> 💡 **知识拓展：投影与物化视图**
> 数据库里"视图"是不存的查询定义，"物化视图"是把查询结果缓存下来的实体表——deriveMessages 就是一个内存中的物化视图：底表（日志）只增不改，视图（消息列表）随底表增量更新，底表结构性变更（replace）时视图重建。学过 React/Vue 的同学还会认出另一个亲戚：derived state + 脏检查。核心思想同源——**单一事实源 + 派生数据自动跟随**。

## 试一试

打开 `packages/core/session/src/surface.ts`，找到 `deriveEventMessage` 函数本体（就在 isReplacementSurfaceEvent 之后）。对照源码回答：一个 `user/message` 事件投影时会保留哪些字段？`tool/result` 呢？再找一个投影为 null 的事件类型，说出它为何不配进入历史。

## 下一讲预告

投影解决了"单会话内怎么看"，但当你有几百个会话、还想跨会话搜索和追溯血统时，就需要一个专门的查询引擎。下一讲我们拆 `session-query` 包：实时优先的语料库合并、与提供方无关的过滤器、以及能画出会话家谱树的 traceSession。
