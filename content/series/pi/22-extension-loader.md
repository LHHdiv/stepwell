---
title: 第22讲·扩展加载器与 jiti 动态加载
summary: 扩展不是 import 进来的，而是启动时"发现—加载—绑定"动态装上的。本讲拆开 loader 流水线，看清 jiti 为何免去编译步骤。
objectives:
  - 说出扩展从发现到可用的四个阶段，以及每阶段的关键函数
  - 解释为什么 pi 选 jiti 而不是 require/import 来加载扩展
  - 理解 VIRTUAL_MODULES 与热更新如何让扩展"免编译即生效"
tags: [pi, 扩展系统, jiti, 动态加载]
keyPoints:
  - "discoverAndLoadExtensions（loader.ts:689）扫描 cwd/.pi/extensions 与内置目录，找出候选扩展"
  - "loadExtensionModule（loader.ts:436）用 jiti 直接加载 .ts/.js 扩展，免去预编译步骤"
  - "bindCore（loader.ts:174-242）在加载期准备 ExtensionAPI 的懒绑定，扩展调用 registerXxx 时才真正落库"
  - "VIRTUAL_MODULES（loader.ts:50-74）为 Bun 运行时提供虚拟模块桥接，保证跨运行时一致"
  - "jiti 让'改一个扩展文件就能立刻生效'成为可能，配合 invalidate 可实现热更新"
---

第 21 讲我们看到，扩展以工厂函数 `(pi: ExtensionAPI) => void` 的形式存在，靠 `loader` 把它们"上户口"。但"上户口"不是一句 `import` 能解决的——pi 要在**启动时**才知道装了哪些扩展、它们在哪、怎么加载。这一讲拆开这条流水线。

## 一、先结论：四阶段流水线

扩展从磁盘上的文件变成系统里可用的能力，经历四个阶段：

```
发现(discover) → 加载(load via jiti) → 绑定(bindCore) → 注册落库(registerXxx)
```

对应 `packages/coding-agent/src/core/extensions/loader.ts` 里的关键函数：

1. **发现**：`discoverAndLoadExtensions`（`loader.ts:689`）扫描候选目录。
2. **加载**：`loadExtensionModule`（`loader.ts:436`）用 jiti 把文件读进来执行。
3. **绑定**：`bindCore`（`loader.ts:174–242`）把 `ExtensionAPI` 的懒绑定备好。
4. **落库**：扩展函数体里调用 `pi.registerTool(...)` 等，才真正写进注册表。

## 二、发现：去哪找扩展

`discoverAndLoadExtensions` 默认看两个地方：

- **项目级**：`cwd/.pi/extensions`——跟着具体项目走，团队可以把"项目专属工具"放进仓库。
- **内置级**：随 pi 发布的内置扩展目录。

这种"项目目录 + 全局内置"的双源结构，和第 20 讲工具的"三条供给线"一脉相承：**能力来自多个作用域，核心只负责汇总**。

## 三、加载：为什么是 jiti

关键在 `loadExtensionModule`（`loader.ts:436`）。它不要求扩展先 `tsc` 编译，而是用 **jiti** 在运行时直接加载 `.ts` / `.js` 文件。

```ts
// 概念示意：jiti 让 TS 扩展'即写即载'
const jiti = createJiti(import.meta.url);
await jiti.import(extensionFilePath);   // 不需要预编译
```

> **知识拓展**：jiti 是"Just-In-Time"的 TS/ESM 加载器，类似 esbuild-register / ts-node，但更轻、对 ESM 更友好。pi 选它，是因为扩展作者（尤其是写 `.pi/extensions` 的人）不该被迫搭一套构建链——**写个 `.ts` 文件就能被识别**，极大降低扩展门槛。

对比传统 `require`：它只能加载编译后的 `.js`，且对 ESM 支持参差；`import()` 静态分析又会把"动态发现的扩展"卡死。jiti 恰好补上"动态 + 免编译 + 跨 ESM/CJS"这块拼图。

## 四、绑定：懒绑定为什么安全

`bindCore`（`loader.ts:174–242`）做了一件巧妙的事：**在加载期就把 `ExtensionAPI` 的方法准备好，但延迟到扩展真正调用时才生效**。

这解决了时序问题：扩展文件被 jiti 加载时，它的顶层代码会立刻调用工厂函数 `(pi) => {...}`。如果此时 `pi.registerTool` 指向的注册表还没就绪，就会崩。懒绑定让 `registerTool` 在调用瞬间才去找真实注册表，保证"先加载、后落库"不打架。

第 21 讲提到的 `loader.ts:196` 注释也印证了这一点：

> registerTool() is valid during extension load; refresh is only needed post-bind.

即"加载期注册工具是合法的，刷新只在绑定后需要"。

## 五、跨运行时与热更新

`loader.ts:50–74` 定义了 `VIRTUAL_MODULES`——为 **Bun** 这类有自己模块系统的运行时提供虚拟模块桥接，让 jiti 加载行为在各运行时一致。

而 jiti 的"免编译"特性，还顺带打开了**热更新**之门：修改扩展文件后，通过 `invalidate` 让 jiti 缓存失效，下次加载就是新代码，无需重启整个 pi。对扩展开发者而言，这相当于"改完即所见"。

## 六、试一试

1. 在 `loader.ts` 里搜 `VIRTUAL_MODULES`，看它为 Bun 具体桥接了哪些模块名（如 `node:*` 还是 `bun:*`）。
2. 打开 `packages/coding-agent/examples/extensions/hello.ts`，确认它的顶层是否直接调用了 `pi.registerTool`——这正是"加载期即注册"的活样本。
3. 思考：如果同一个扩展被项目目录和内置目录同时发现，loader 该怎么取舍？从"作用域优先级"角度给出你的设计判断。

## 下一讲预告

扩展装好了，"产品形态"也定型了。但产品还得"跑起来"——而且要以不同姿态跑：有人盯着终端交互，有人要批量跑脚本，有人要把 pi 当服务调用。下一讲看 pi 的三种运行模式：interactive / print / rpc。
