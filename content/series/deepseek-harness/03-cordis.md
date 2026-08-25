---
title: 第03讲·Cordis 入门：一切皆插件的世界观
summary: 认识 dsh 赖以构建的 Cordis 插件框架：插件、服务、上下文三个概念，一次讲透。
objectives:
  - 理解"插件化架构"解决什么问题
  - 掌握 Cordis 的三个核心词：plugin、service、context
  - 能看懂一个最简单的 dsh 插件源码
tags: [deepseek-harness, cordis, 插件]
keyPoints:
  - Cordis 是 Koishi 作者开发的插件框架，dsh 全部构建在它之上
  - ctx 是共享上下文，服务挂载在 ctx 上，插件向 ctx 注册能力
  - 插件用 inject 声明依赖，框架负责按序装载
---

先想一个问题：假设你要造一个智能体框架，里面模型适配器、文件工具、命令执行、会话管理……几十个部件。你会怎么组织它们？

**方案 A**：写一个大单体，所有功能互相直接调用。起步快，但你想把 DeepSeek 换成别的模型？想把读文件的工具去掉？——都得动核心代码。

**方案 B**：定一套"插槽规范"，每个部件做成标准插头，运行时按配置插拔。换部件 = 换配置，核心一行不动。

dsh 选了 B，而提供"插槽规范"的框架就是 **Cordis**。它原本是聊天机器人框架 Koishi 的底座，被 dsh 内嵌进了 `vendor/` 目录。

## 三个核心词

Cordis 的世界观用三个词就能说清：

### 1. Context（上下文）—— 一块公共插线板

`ctx` 是全局共享的上下文对象。所有部件都通过它交流：

```ts
// 从 ctx 上取一个已注册的服务
const tools = ctx.tools;
```

### 2. Service（服务）—— 插线板上的插座

服务是某种能力的统一接口，挂在 `ctx` 上。比如 `ctx.llm` 是"模型能力"插座、`ctx.tools` 是"工具注册"插座。

关键在于：**插座定义接口，不关心谁来实现**。`ctx.llm` 只规定"能发起对话请求"，至于是 DeepSeek 还是其他模型来响应，它不管。

### 3. Plugin（插件）—— 一个个具体的插头

插件是符合规范的具体实现，负责两件事：**声明自己需要哪些插座，然后往插座里装东西**：

```ts
// 一个最典型的 dsh 插件长这样（示意）
export function apply(ctx: Context) {
  // 我要往 llm 插座上注册 DeepSeek 适配器
  ctx.llm.registerAdapter(['deepseek'], new DeepSeekAdapter());
}

// 声明依赖：本插件需要 llm 服务先就位
export const inject = ['llm'];
```

`inject` 这行是精髓：插件**声明**依赖而不**寻找**依赖。Cordis 保证 `apply` 执行时，`ctx.llm` 已经就绪。就像装修：电工只需要说"我需要电路"，不需要自己去发电。

## 为什么这个设计对你重要

回忆第 01 讲的愿景：你将来要基于 dsh 维护自己的智能体。有了 Cordis，你的大部分定制都是**新写一个插件**，而不是修改 dsh 的代码：

| 你想要 | 你的做法 |
|---|---|
| 加一个自定义工具（比如查快递） | 写个插件往 `ctx.tools` 注册 |
| 换/加一个模型供应商 | 写个插件往 `ctx.llm` 注册适配器 |
| 在每轮对话前注入提醒 | 写个插件监听对应事件 |

上游 dsh 升级时，你的定制几乎不受影响——这是"终身伙伴"能长期维护的技术前提。

## 试一试

打开 [docs/cordis-primer.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.zh.md)（官方写的 Cordis 入门文档，中文版把 `.md` 改成 `.zh.md`），通读一遍。读不懂的地方记下来，它们大多会在后续章节自然解开。

## 下一讲预告

概念齐备，该动手了。下一讲我们把 dsh 从源码跑起来，亲眼看看那个"插件树"。
