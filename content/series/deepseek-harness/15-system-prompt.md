---
title: 第15讲·system-prompt：智能体的世界观是如何组装的
summary: 精读 system-prompt 服务：片段注册与 order 约定、complete 抢占、变量插值、上下文快照的落账路径。
objectives:
  - 说清 section / context / variable 三种贡献物的区别与渲染时机
  - 理解 order 数字的"社会公约"与 persona 槽位的替换机制
  - 解释 complete 段落为什么允许"整体接管"系统提示词
tags: [deepseek-harness, system-prompt, 提示词]
keyPoints:
  - ctx.systemPrompt.assemble() 产出 PromptAssembly：sections + contexts + tools + variables 四件套
  - 片段按 order 升序拼接；-100 是框架身份、0 是部署人设、100-199 是工具指引——数字即宪法惯例
  - complete:true 的段落可整体替换全部 sections，但瀑布照跑、工具清单照并入
  - 文本里的 {{variable}} 延迟到 renderPrompt 才插值——组装与渲染分离
---

第 13、14 讲里，`systemPrompt.assemble(...)` 和 `renderPrompt(assembly)` 我们一直当黑盒 passing。这个黑盒就是 `core/system-prompt` 包（545 行）——它回答一个看似简单实则要命的问题：**发给模型的系统提示词，到底由哪些字组成？谁有权往里加字？**

## 一、三种贡献物：section、context、variable

打开 `packages/core/system-prompt/src/index.ts`，服务向插件开放三种注册口：

**① PromptSection（提示词片段）**——系统提示词的正文章节：

```ts
readonly name: string      // 全局唯一名，重复注册直接抛错
readonly order: number     // 升序拼接的排序键
readonly text: string | ((context) => string)   // 静态文本或动态提供者
readonly complete?: boolean                     // 见下文：整体接管开关
```

order 不是随便填的，官方注释写明了一套**数字社会公约**：

```text
-100        harness 身份（"你是一个运行在 dsh 上的智能体…"）
 0          部署人设（deployment persona，模型读到的第一段）
100-199     工具使用指引
其他负数     渲染在人设之前
```

为什么值得用一套公约而不是配置项？因为**注册者来自互不相识的几十个插件**。只要大家都遵守"-100 是身份、0 是人设"的惯例，几十个来源的片段就能拼出语义正确的整体——不需要中央协调员。这是分布式协作的老智慧：靠协议不靠调度。

**② PromptContext(上下文快照)**——注意它和 section 的本质区别在消费对象：section 进系统提示词（每轮都发），context 由第 14 讲的 runtime-context 投影处理，物化成**持久的 user 角色消息快照**落进日志。环境信息走这条路，是因为它们是"某时刻的事实"，需要留痕、需要占用对话位置，而不是常驻的世界观。

**③ variables（变量）**——所有文本里的 `{{variable}}` 占位符统一在渲染期插值。变量名有正则约束（`/^[a-z][a-z0-9_]*$/`），拼错的变量不会静默通过。

> 💡 **知识拓展：为什么要拆成"组装→渲染"两个阶段？**
> assemble() 是异步的（要跑瀑布、查工具注册表、调动态 provider），产出的是结构化的 PromptAssembly——sections/contexts/tools/variables 各就各位、尚未拼串。renderPrompt() 是纯同步函数，只做拼接和 {{变量}} 替换。好处有三：组装结果可以整份冻结存档（第 14 讲 buildRequest 里被 deepFreeze 的正是它）；测试可以对结构断言而不必解析字符串；同一份组装能以不同方式渲染（比如调试时打印分节视图）。**先结构后文本**，是所有"模板引擎"类设计的通用心法。

## 二、assemble()：一次装配的全过程

`index.ts:467` 的 assemble 方法把四种原料汇成一锅：

1. **收 sections**：遍历所有已注册片段，执行 text 提供者（传入本次的 AssembleContext——含信号和 agent 信息），按 order 排序；
2. **收 contexts**：同样求值排序；
3. **收工具 schema**：从 ctx.tools 拉取本作用域可见的全部工具描述（这就是第 02 讲流程图第③站"tool schemas"的出处）——工具提供方还能声明 knownNames 供配置校验；
4. **跑协作瀑布**：让监听者对整个装配做最后加工。

## 三、complete：一个段落的"政变权"

最有趣的设计是 `complete?: boolean`。一个标记为 complete 的段落意味着："**我的文本就是完整的系统提示词，别的 sections 都不要了**"。但注释精确限定了政变范围：

> Assembly still runs the cooperative waterfall so tools, contexts, and variables can be resolved, then restores this exact section as the sole prompt section. More than one effective complete section makes assembly fail.

翻译：瀑布照样跑、工具清单照样并入、变量照样解析——只是最终渲染时 sections 只保留这一个。且**两个 complete 同时生效 = 组装失败**，绝不含糊地"选第一个"。

为什么需要这个机制？想想真实场景：某些企业部署要求系统提示词逐字可控（合规审计），或者某个 agent preset 要彻底换人格。没有 complete 就只能"注册一堆 order 极小的段落去压别人"——脆弱且不可读。有了它，接管是显式声明；而冲突立即失败，则延续了第 07 讲的 fail-loud 传统。

配套还有一个人设槽位机制：`PERSONA_SECTION = 'deployment:persona'`、`PERSONA_ORDER = 0` 作为导出常量，注释说破了机关——agent preset 替换部署人设的方式，就是**用同一个名字再注册一次**。"双方命名同一段落，让替换成立而非重复"：名字即插槽，覆盖即更新。

## 四、回到主循环：组装结果的三条去向

把镜头拉回 agent.ts 的 preStep（第 13 讲），一份 PromptAssembly 在那里被一分为三：

```ts
const assembly = await this.loopCtx.systemPrompt.assemble(...)  // 组装
const sections = renderContextSections(assembly)                // ① 上下文部分→投影
const system = renderPrompt(assembly)                           // ② 正文→系统提示词字符串
// ③ assembly.tools → buildRequest 里并入请求的工具清单
```

①经 runtime-context 投影决定是否注入 user 快照；②成为请求的 system 字段并随 request/header 记入日志；③进入冻结请求发给模型。三条去向都有日志背书——第 07 讲那句"模型可见即已记录"，在这里完成了它的最后一环。

## 试一试

打开 `packages/core/system-prompt/src/index.ts`，搜索 `PERSONA_ORDER` 的三处引用，回答：如果某插件恶意注册了一个 order=-9999 的段落想抢在人设前面，系统会拦它吗？结合第 03 讲的"waterfall 短路是策略插件的合法武器"，你觉得该在哪一层防这种事？

## 下一讲预告

世界观组装完毕，还剩两件影响对话质量的大事：历史太长怎么办、工具结果太大怎么办？下一讲我们看 compaction 压缩家族与 spill 外溢机制——它们分别管理"对话的记忆负担"和"单条事实的体积"，并与第 08 讲的 surface replace 机制会师。
