---
title: 第30讲·工具注册表与 defineTool：智能体的手脚
summary: 精读 core/tools 的注册机制与 defineTool DSL，看一个工具是如何被定义、注册、暴露给模型的。
objectives:
  - 读懂 ToolDefinition 的完整字段
  - 会用 defineTool 写一个最小工具
  - 理解"作用域化注册表"：为什么不同智能体看到不同工具
tags: [deepseek-harness, tools, 插件开发]
keyPoints:
  - 工具 = 名字 + 参数 schema + 执行函数 + 元信息，用 defineTool 定义
  - 注册表按作用域隔离：每个 agent 只看到自己的工具
  - 模型看到的"工具清单"就是注册表导出的 schema 列表
---

卷四：工具系统。dsh 里"读文件""跑命令""搜网页"都是工具。这一讲回答：一个工具从定义到被模型调用，经历了什么。

## 工具的解剖图

打开 `packages/core/tools/src/schema.ts`，核心是 `ToolDefinition`（简化）：

```ts
interface ToolDefinition<TInput> {
  name: string;                    // 工具名，模型用它点名
  description: string;             // 给模型看的说明书
  parametersSchema: JsonSchema;    // 参数长什么样（JSON Schema）
  execute(input: TInput, ctx: ToolContext): Promise<ToolOutput>;
}
```

四个字段各司其职：

- `name`：模型在 tool_use 块里写的名字，必须唯一；
- `description`：**写给模型看的**。模型靠它判断什么时候该用这个工具——写得好坏直接影响模型用不用得对。这是提示词工程的一部分，不是注释；
- `parametersSchema`：JSON Schema 描述参数。模型据此生成参数，运行时据此校验参数——一份 schema 两处用；
- `execute`：真正干活的地方。

`defineTool` 是一个薄薄的 DSL 函数，作用是**用 TypeScript 泛型把 schema 和 input 类型绑在一起**：你声明了参数 schema，execute 的入参类型就自动推导出来——参数名写错，编译期报错。

## 注册表：不只是个 Map

`core/tools/src/index.ts`（1947 行，全仓库最大单文件）里，注册表不是简单的 `Map<name, tool>`。它是**作用域化（scoped）**的：

回忆第 03 讲的 `core/scope`——每个 agent 有自己的局部世界。工具注册表建在 scope 之上，于是：

- 主 agent 可以有全部工具；
- 你起一个"只能读代码不能写文件"的子 agent，只需给它一个工具子集；
- 权限控制天然按 agent 隔离，不用在 execute 里写 if。

第 22 讲的三段瀑布（pre-execute/execute/post-execute）也定义在这个文件里——1947 行听起来吓人，拆开看就是：注册表管理 + schema 导出 + 瀑布调度 + 守卫逻辑，四件事。

## 写一个最小工具（现在就会）

把学到的用上。一个"掷骰子"工具：

```ts
import { defineTool } from '@deepseek-ai/dsh-tools';

export const rollDice = defineTool({
  name: 'roll_dice',
  description: '掷一个六面骰子，返回 1-6 的随机数。当用户想掷骰子或需要随机决策时使用。',
  parametersSchema: {
    type: 'object',
    properties: {
      sides: { type: 'number', description: '骰子面数，默认 6' }
    },
  },
  async execute(input) {
    const sides = input.sides ?? 6;
    const value = 1 + Math.floor(Math.random() * sides);
    return { content: `🎲 掷出了 ${value} 点` };
  },
});
```

注意 description 的写法：说了**是什么**，还说**什么时候该用**——后者对模型选工具的帮助极大。把它包成一个插件（第 03 讲的格式）注册进 `ctx.tools`，重启 dsh，模型就"长出"了这个能力。

## 模型怎么"知道"工具存在

闭环一下：agent-loop 每次组装请求时（第 21 讲的第⑥步），从注册表导出当前作用域全部工具的 name + description + parametersSchema，附在请求里。模型"看"到这份清单，才会在需要时发出 tool_use。**工具能力 = 注册表内容**，没有任何硬编码。

## 试一试

打开 `packages/core/tools/src/schema.ts` 找到 defineTool 的真实签名，和本讲的简化版对比：多了哪些字段？（提示：找和"注解/注解器""超时"相关的。）挑一个字段查查它的用途——这是你第一次独立探索这个代码库，以后要常这么干。

## 下一讲预告

工具的手脚长好了。卷五进入 LLM 层：适配器接缝怎么设计、DeepSeek 的 HTTP/SSE 流怎么被翻译成 StreamChunk——看完你就能给任意模型供应商写适配器。
