---
title: 第38讲·CLI 自研参数解析
summary: pi 没用 commander/yargs，而是自己写了解析器。本讲看 cli/args.ts 的 parseArgs，以及扩展如何往 CLI 注入新 flag。
objectives:
  - 说出 pi 的 CLI 解析入口在哪、怎么被调用
  - 解释"扩展能注入 CLI flag"意味着什么（连接第 21 讲 registerFlag）
  - 推断 pi 为何自研解析器而非用现成库
tags: [pi, CLI, 参数解析, 扩展]
keyPoints:
  - "入口在 cli/args.ts：main.ts:11 导入 parseArgs 与 printHelp，:156/:609 两处调用 parseArgs 解析参数"
  - "扩展能注入 CLI flag：main.ts:857 把各扩展的 flags 摊平进最终参数表，对应第 21 讲 registerFlag"
  - "--no-builtin-tools 这类开关在 args.ts:35 定义、:121 解析置位（第 20 讲用过）"
  - "pi 自研解析器（非 commander/yargs），换取对'扩展 flag 合并'与错误提示的完全控制"
  - "解析结果（Args）随后驱动 AppMode 分派（第 41 讲）与 AgentSession 配置（第 39 讲）"
---

前面 7 卷把 pi 的每个零件拆开讲。最后一卷看"总装"——`coding-agent` 如何把零件拧成一个用户敲 `pi` 就能跑的产品。第一站是它的命令行入口：参数解析。

## 一、先结论：解析器是自研的

`coding-agent` 没用 `commander` / `yargs` 这类流行库，而是自己写了个解析器。入口在 `packages/coding-agent/src/cli/args.ts`。看 `main.ts:11`：

```ts
import { type Args, type Mode, parseArgs, printHelp } from "./cli/args.ts";
```

`parseArgs` 是核心——把 `process.argv` 解析成结构化 `Args`；`printHelp` 负责 `--help` 的输出。调用点在 `main.ts:156`（子命令参数）和 `:609`（主参数）：

```ts
const parsed = parseArgs(command.args);   // :156
const parsed = parseArgs(args);           // :609
```

## 二、扩展能往 CLI 注入 flag

这是自研解析器最妙的回报。回忆第 21 讲 `ExtensionAPI.registerFlag`——扩展可以声明"我要给 CLI 加一个新参数"。这些 flag 不是写死在 `args.ts` 里的，而是**运行时收集**的。看 `main.ts:857`：

```ts
const allFlags = extensions.flatMap((extension) => Array.from(extension.flags.values()));
```

`extensions.flatMap(...)` 把所有扩展注册的 `flags` 摊平，合并进最终参数表。于是：

- 装了 A 扩展 → CLI 多几个 `--a-xxx` 开关；
- 装了 B 扩展 → 又多几个；
- 核心的 `args.ts` 一行不用改。

这正是第 03 讲"产品形态可插拔"在命令行层的落地：**CLI 的表面随扩展动态生长**。

## 三、内置开关长什么样

自研不代表简陋。看 `--no-builtin-tools` 的定义（`cli/args.ts:35`）：

```ts
noBuiltinTools?: boolean;   // 参数 schema 里声明
// 解析到 :121 时置 true
```

一个"可选布尔"就这么声明，解析器在 `:121` 处识别到这个 flag 就置位，后续 `main.ts:538` 据此跳过内置工具装载（第 20 讲用过）。模式、调试开关、模型选择等，都是同一套声明式 schema 管理的。

## 四、为什么自研而不是用库

用 `commander` 能不能也"动态加 flag"？能，但更别扭——现成库通常假设你**在写代码时**就把所有 flag 注册好。pi 的 flag 来自**运行时发现的扩展**，和库的静态心智模型有摩擦。自研解析器让"核心 flag + 扩展 flag"在同一张表里自然合并，且错误提示、补全、帮助文本都能按 pi 的 UX 精雕。

> **知识拓展**：自研小型解析器在"需要动态 schema"的场景很常见。代价是你得自己处理 `--key=value`、`-k v`、布尔取反、子命令等边界；收益是和扩展系统的耦合点完全可控。pi 选了后者，因为它把"可扩展性"看得比"少写 200 行"重。

## 五、解析结果去哪了

`parseArgs` 产出的 `Args` 是后续所有分派的源头：

- **决定模式**：`Args` 里的模式/标志驱动第 41 讲的 `AppMode` 分派（interactive / print / rpc）；
- **配置会话**：解析出的 `customTools`、`extensions`、`noBuiltinTools` 等，喂给第 39 讲的 `AgentSession` 配置；
- **打印帮助**：`--help` 走 `printHelp`，而帮助文本已包含扩展注入的 flag。

一句话：**CLI 解析是"用户意图 → 系统行为"的第一道翻译**。

## 六、试一试

1. 打开 `cli/args.ts`，数一数它自己定义了哪些内置 flag（除了 `--no-builtin-tools`），看是否覆盖了"模式/模型/调试"等维度。
2. 在 `main.ts:857` 附近看 `extension.flags` 是什么类型（Hint：回到第 21 讲 `registerFlag` 的 `FlagDefinition`），推断一个扩展 flag 如何被校验。
3. 思考：如果扩展 A 和扩展 B 都注册了同名 flag `--foo`，`flatMap` 会怎么处理？从"flag 命名空间"角度给 pi 的设计建议。

## 下一讲预告

CLI 把用户意图翻成 `Args`，但 `Args` 还不"能干活"。下一讲看 `AgentSession`——它如何把底层 `Agent` 内核、工具、扩展、持久化包成一个"可被驱动跑起来"的会话对象。
