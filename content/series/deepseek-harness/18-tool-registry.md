---
title: 第18讲·工具注册表：defineTool 的完整契约
summary: 精读 ToolDefinition 接口：schema、execute、output 三大件与 finalizeContent、timeoutMs 等进阶字段。
objectives:
  - 背出 ToolDefinition 的必填三件套及其各自消费者
  - 理解"canonical value 与 model content 分离"的设计动机
  - 解释 timeoutMs 为什么绝不发给模型
tags: [deepseek-harness, tools, defineTool]
keyPoints:
  - 工具 = schema（给模型看）+ execute（真正干活）+ output（结果契约）
  - execute 只返回 lossless JSON 的 canonical value；模型看到什么由 render 决定
  - timeoutMs 是纯内部元数据，schemas() 白名单只放行 name/description/parameters
  - 注册表按作用域隔离——不同智能体可见不同工具箱
---

卷四开篇。前三卷我们看着消息流转，但"干活"的瞬间一直是个黑盒：`tools/execute` 里到底发生了什么？本讲先拆**工具的出生证明**——一个工具在 dsh 里如何定义。核心接口是 `core/tools/src/index.ts` 第 222 行的 ToolDefinition。

## 一、三大件：schema、execute、output

```ts
export interface ToolDefinition extends ToolSchema {
  readonly output: ToolOutputDefinition                    // ③ 结果契约
  execute(args: unknown, exec: ToolRunContext): Promise<unknown>  // ② 干活
  // ... 进阶可选字段见下文
}
```

**① schema（继承自 ToolSchema）——给模型看的名片。** name、description、parameters(JSON Schema)。它会被 system-prompt 组装进请求（第 15 讲的 assembly.tools），是模型决定"要不要用这个工具"的唯一依据。所以描述文案的质量直接决定工具的可用性——这是所有 Agent 开发的黄金经验：**工具描述是写给模型的提示词，不是写给人类的文档**。

**② execute()——真正干活的函数体。** 注意注释里的两个承诺式要求：

- 入参 args 是"losslessly snapshotted, **frozen** model arguments"——模型产出的参数被无损快照并冻结后交给你，工具改不了、也赖不掉；
- "Async work must observe or forward `exec.signal`"——异步工作必须监听取消信号。注册表保证不抛弃你的 Promise，但也"cannot hard-kill same-process code"：同进程代码无法强杀，协作式取消是唯一正道。这解释了为什么 timeoutMs 字段要求工具"声明自己会转发 signal"才生效——**超时机制的前提是工具自觉配合取消**。

**③ output——结果的契约双联画。** 这是 dsh 最讲究的部分：

```ts
export interface ToolOutputDefinition {
  readonly schema: JsonSchemaNode   // canonical value 必须通过的结构校验
  render(args, value): ContentBlock[]          // 模型看到的内容投影
  presentationMeta?(args, value): JsonValue    // UI 卡片用的展示元数据
}
```

关键洞察藏在分工里：execute 返回的是 **canonical value**（规范的、无损的 JSON 值），而**模型看到什么由 render 单独决定**。为什么要分离？因为机器真相和模型食粮经常不该是一回事：一个 `ls` 工具的 canonical value 可能是完整的结构化文件列表（含权限、inode），render 出给模型的可能只是排好版的文件名清单。真相全须全尾地躺在日志里，模型拿到的是消化过的版本。UI 想要更炫的卡片？presentationMeta 再单独供一份。**一份数据，三种观众，三个出口。**

## 二、进阶字段：每个都有一段故事

继续读接口，可选字段个个有戏：

**finalizeContent?** —— "最后一公里的内容变换"。注释写明它的调用时机精确到苛刻："registry snapshots this callback when execution starts and invokes it exactly once for every normalized outcome, including pipeline failures that bypass tools/post-execute"。翻译：不管执行成功、被拒绝还是流水线出错，这个回调都恰好在物化前执行一次——它是内容层面的最终不变量守卫。且"must be total and must not throw"——你自己签收了最后防线，就不许再抛锅。

**timeoutMs?** —— 协作式超时预算。注意那句重复强调："it is NEVER sent to the model——schemas() whitelists only name/description/parameters"。发给模型的 schema 是白名单制：名称、描述、参数之外的一切（超时、独占标记、输出 schema）都是**内部元数据**。模型不需要知道工具的超时是 30 秒——这些信息只会稀释它的注意力，还浪费 token。

**exclusive 分类器** —— "Pure synchronous classifier for overlap with sibling tool calls. Only true opts in"。声明自己是独占型工具（第 14 讲调度器里那个屏障的来源）。默认安全：省略、抛异常、返回非 true 都按独占处理——并发优化必须显式选择，保守是缺省值。

> 💡 **知识拓展：JSON Schema 是什么？**
> 描述 JSON 数据结构的规范语言：`{ type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }` 声明"我接受一个含 path 字符串字段的对象"。它是模型函数调用的通用方言——OpenAI/Anthropic/DeepSeek 的 function calling 全用它描述参数。dsh 还配了 656 行的 json-schema.ts 做**校验器**：模型编造出不合法的参数，在进入 execute 之前就被拦下。

## 三、注册表：作用域化的工具箱

工具注册在哪？`ctx.tools` 服务上，而注册行为发生在插件挂载时（第 03 讲的可逆副作用）。结合第 11 讲的 scope 原语，答案自然浮现：**每个 agent 作用域可以有自己的注册层**。子智能体看不到主智能体的私有工具；agent preset 可以只暴露一个精简工具箱（第 07 讲架构文档那句话"让某个会话拥有不同的能力集合"的实现现场）。

注册表的变更还会广播 `tools/change` 事件（@mode emit）——正在运行的会话如果工具箱变了，UI 和缓存都能即时感知。

还有个彩蛋值得点名：`code-mode.ts`（681 行）实现了 run_code 类工具的基础设施——把全部工具 schema 编译成 Python/TypeScript 的类型化 SDK 让模型直接写代码批量调用，比逐个函数调用高效得多。这是"代码即工具胶水"路线，第 19 讲巡礼时再见。

## 试一试

打开 `packages/core/tools/src/index.ts`，找到 schemas() 方法（或白名单逻辑），确认除 name/description/parameters 外还有什么字段能到达模型。然后设计题：假如你要给 dsh 写一个"发邮件"工具，execute 返回的 canonical value 应该包含哪些字段？哪些该进 render、哪些只留在 canonical 层？

## 下一讲预告

契约读懂了，接下来看仓库里现成的工具们。下一讲巡礼内置工具全家桶：fs 家族、搜索、终端六件套、web 三引擎、subagent 调度……看官方是如何用同一个 defineTool 契约写出几十个性格迥异的工具的。
