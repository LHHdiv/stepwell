---
title: 第03讲·Cordis：读懂"一切皆插件"的插线板
summary: 拆解 dsh 底层插件框架 Cordis 的五个核心观念、四种事件分发模式、waterfall 洋葱语义，并对照真实 agent.ts 用法。
objectives:
  - 用自己的话复述 Cordis 的五个核心观念
  - 分清 emit / waterfall / parallel / serial 四种派发模式的适用场景
  - 在真实 agent.ts 里指认 Context、事件派发与可逆副作用的具体用法
tags: [deepseek-harness, cordis, 插件框架]
keyPoints:
  - 插件 = 实现 Service 的对象；Context = 服务容器，服务占据稳定 ctx.<key>
  - 依赖通过 inject 声明，加载顺序由依赖图推导，而非手动编排
  - waterfall 是环绕中间件：监听者不调 next() 即短路，短路是策略插件的合法武器
  - 一切注册都是可逆副作用（ctx.effect / ctx.on），卸载时自动撤销
---

上一讲 `agent.ts` 里 `ctx.tools`、`ctx.llm`、`dispatch.waterfall('agent/pre-step', …)` 反复出现。它们全部来自同一套机制——**Cordis**，dsh 以 vendor 方式内嵌在 `vendor/` 目录的插件框架。官方文档甚至说："不存在需要打补丁的特权内核"。这一讲我们拆这块插线板；理解了它，后面读任何包的源码都会看到似曾相识的形状。

本讲依据 `docs/cordis-primer.md`（Cordis 官方入门）与 `AGENTS.md` 的约定，逐条落地。

## 一、五个核心观念

官方入门把 Cordis 浓缩成五句话，我们用真实代码印证。

**① 插件是实现 Service 的对象。** 它可以是一个带可选 `inject` 和 `apply(ctx)` 字段的函数，也可以是一个 Service 子类。下面是符合文档描述的最小插件形状（监听一个事件，放行时打日志）：

```ts
import type { Context } from '@deepseek-ai/cordis'

// 一个最小插件：监听 agent/pre-step，在放行前打印一行
export default (ctx: Context) => {
  // ctx.on 注册一个事件监听；返回 disposer 即"可逆副作用"
  ctx.on('agent/pre-step', (payload, next) => {
    console.log('[pre-step] 即将组装第', payload.step, '步')
    return next()   // 必须调用 next() 才能放行（waterfall 语义，见第三节）
  })
}
```

**② Context 是服务的容器。** 每个服务占据一个稳定的 `ctx.<key>`——`ctx.sessions`、`ctx.llm`、`ctx.tools`……其他插件通过 key 找服务，而不是 import 具体实现。这是关键设计：**面向插槽编程，而非面向零件编程**。想换掉文件系统提供方？只要新提供方还挂 `ctx.fs` 这个键，所有消费方无感知。

> **知识拓展：这就是控制反转（IoC）**
> 传统写法里，A 需要文件系统就自己去 `import` 某个具体的 FS 类——依赖被写死。IoC（Inversion of Control，控制反转）把这个权力"反转"给容器：组件只声明"我需要一个 fs"，具体给哪个实现由装配时的插件树决定。Spring、Angular 都是这个思路。好处有二：实现可替换；测试时可注入假实现——dsh 要求 per-file 100% 覆盖，正是靠这种可注入性达成的。

**③ 通过 inject 声明服务依赖。** 插件声明所需服务后，会等它们就绪才启动。加载顺序由依赖图自动推导，不需要手写"先启动 A 再启动 B"。依赖即顺序——这正是第 01 讲说的"上层依赖下层"。

**④ 类型化事件用于通信。** 服务通过 TypeScript 的**声明合并**注册事件名和参数类型，然后以四种模式之一分发（下一节）。类型化意味着：你 `emit` 一个拼错名字的事件，编译器当场报错——事件系统不是字符串魔法，而是有编译期保障的契约。

**⑤ 注册是可逆的副作用。** 这是 Cordis 最优雅的一环：所有注册——提示词片段、工具 schema、适配器、监听器——都通过 `ctx.effect()` 或 `ctx.on()` 安装，插件卸载或热重载时按预期撤销。类比酒店房卡：退房时门禁自动失效，不需要你挨个房间去关灯。"拔插头不留火花"，是一切皆插件能成立的前提。

## 二、四种事件派发模式

每个事件属于且仅属于一种派发模式，这是事件公开约定的一部分（依据 cordis-primer 的 Dispatch Modes 表，逐字核对）：

| 模式 | 是否 await | 派发顺序 | 有返回值？ | 直觉 |
|---|---|---|---|---|
| `emit` | 否 | 注册顺序逐个观察 | 无 | **广播**：贴公告，大家看看 |
| `waterfall` | 否 | 注册顺序逐层包装 | 有 | **洋葱**：层层把关、加工 |
| `parallel` | 是 | 所有监听者并行 | 无 | **群呼**：同时通知、互不等待 |
| `serial` | 是 | 注册顺序依次执行 | 有 | **听证会**：按序发言、汇总 |

对照第 02 讲验证你的理解：`assistant/chunk`（通知 UI 更新流式碎片）该用哪种？——`emit` 或 `parallel`，因为它只是广播事实。`tools/execute`（要不要放行这次执行）？——`waterfall`，需要把关链。`agent/turn-stopping`（最终裁决"轮次可以停了吗"）？——`serial`，第 02 讲见过它 `await this.dispatch.serial('agent/turn-stopping', …)`，按序收集意见后一锤定音。

> **知识拓展：为什么 emit/waterfall 不 await，parallel/serial 要 await？**
> 取决于语义需求。`emit`/`waterfall` 用于同步的观察与包装——链条短、要求快，异步化反而引入复杂度；`parallel`/`serial` 用于可能耗时的异步工作（如调用外部服务），框架必须 `await` 所有监听者完成才能继续。设计事件系统时先问"监听者会不会做慢事"，再选模式。

## 三、waterfall 的洋葱语义

waterfall 值得单独一节，因为它是 dsh 最常用的扩展手法（第 02 讲的 `agent/pre-step`、`agent/request`、下一卷的 `tools/*` 都是它）。监听者收到的签名是 `(...args, next)`：

- 调用 `next()` → 执行下游监听者，其返回值交回给你，你可以包装后再返回；
- 不调 `next()` 直接返回 → **短路**，下游全部跳过。

协作式监听者的典型姿势是"改一改共享对象，然后委托"；策略型监听者的典型姿势是"拥有决策权时短路"——比如审批插件判断命令危险，直接短路返回拒绝，后面的执行环节根本不会发生。官方实践规则说得很清楚：**仅当监听者必须在普通注册之前运行时才用 `prepend: true`**——绝大多数场景下，注册顺序就是责任链顺序。

如果你用过 Koa / Express 的中间件，会发现 waterfall 就是同一个洋葱模型：请求穿过一层层中间件到达核心，响应再原路穿回，每层都有机会加工或拦截。

## 四、在真实 agent.ts 里指认 Cordis

光讲概念不够，回到第 02 讲读过的 `agent.ts`，把 Cordis 的用法一一指认出来：

1. **Context 注入**：构造函数里 `this.scope = createScope(loopCtx, this)` 然后 `this.ctx = this.scope.ctx.extend({ agent: this })`——每个 agent 拿到一个从全局 `loopCtx` 扩展出来的、带 `agent` 自己引用的子 Context。这就是"作用域化注册"（第 11 讲细讲 scope）。
2. **事件广播**：`setPhase` 里 `this.dispatch.emit('agent/status', { status })`——经典 `emit`，通知 UI 状态变了。
3. **waterfall 裁决**：`preStep` 里 `this.dispatch.waterfall('agent/pre-step', payload, defaultAction)`——把"模型看到什么"交给监听链决定，默认动作是放行。
4. **可逆副作用**：AGENTS.md 写明 "every contribution goes through `ctx.effect()` / `ctx.on()`"。`agent.ts` 里 `new Inbox(...)` 的回调通过 `this.dispatch.emit('agent/inbox/inserted', …)` 广播插入事件——这些注册都随插件生命周期撤销。

一句话总结：**第 02 讲那台主循环机器，本身就是 Cordis 的一个插件**（`ctx.agentLoop` 上的默认驱动器）。所谓"一切皆插件"，落地就是这么朴素。

> **知识拓展：声明合并如何撑起类型化事件？**
> Cordis 让服务用 TS 的 declaration merging 把事件名和载荷类型写进一个共享的 `EventMap` 接口。示意（不是某包的复制，是原理示意）：
> ```ts
> declare module '@deepseek-ai/cordis' {
>   interface EventMap {
>     'agent/pre-step': { messages: UserMessage[]; turn: number; step: number; signal: AbortSignal }
>   }
> }
> ```
> 这样任何 `ctx.on('agent/pre-step', (payload) => …)` 的 `payload` 都自带精确类型；改了载荷忘了改监听，编译器立刻报错。AGENTS.md 把这条列为硬纪律："Typed events use declaration merging"——事件的 JSDoc 还要标 `@mode` 和载荷 `@param`，生成的目录才能核对派发点与声明是否一致。这也是为什么 dsh 敢让 55 个包互相只通过 `ctx` 键通信：类型在编译期就把契约钉死了。

## 五、为什么"可替换"成立

五个观念合起来，回答一个问题：dsh 凭什么敢说"没有特权内核"？因为：

- 所有行为都挂在 `ctx` 上的扩展点，换能力 = 挂/卸插件，不碰核心代码；
- 注册是 `ctx.effect`/`ctx.on` 的可逆副作用，卸载自动撤销，不留火花；
- 依赖靠 `inject` 声明，加载顺序由依赖图推导，不需要脆弱的启动脚本。

三者叠加，DeepSeek 自己迭代时也是"加插件、换插件"，核心不会被补丁腐蚀。这既是 dsh 适合"学习"的原因，也是它适合"改造"的原因——第 43 讲毕业设计，你会真的写一个插件把某个内置能力换成自己的实现。

## 试一试

两选一，把今天的知识落地：

1. 写一个最小插件文件（参考第一节的 `(ctx) => { ctx.on('agent/pre-step', (p, next) => next()) }`），在放行前 `console.log` 出 `payload.turn` 和 `payload.step`；思考它该被 `prepend` 还是普通注册——为什么？
2. 在仓库根目录执行 `dsh --profile web --dump-config`（需先 `pnpm run build`）。终端会打印出**你这台机器实际启动的插件树**——每一个模型适配器、工具、持久化后端都是一条带 id 和 config 的条目。搜一搜 `sessions`、`tools`、`llm`，找到它们的挂载点。官方原话："它打印出的任何条目，都可以由你自己的 patch 替换。" 这就是"一切皆插件"的肉眼证据。

## 下一讲预告

框架懂了，该通电了。下一讲我们真把仓库跑起来：`pnpm install` 后的类型检查、构建、headless 跑一个真实任务，以及那条最有分量的命令——`--dump-config` 吐出的插件树长什么样。跑通一次，你才真正拥有这台机器。
