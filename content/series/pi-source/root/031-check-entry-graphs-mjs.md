---
title: "27 · check-entry-graphs.mjs — 窄入口不许拖进整个桶"
summary: "读懂文件头那句：Entry points are cost contracts。 package.json 的 exports 声明了哪些模块公开。一个不小心的 export 能让「只要一个纯函数」的入口变成求值 37MB 模块图，而且"
tags: [pi, root]
---
源码：`scripts/check-entry-graphs.mjs`  
被谁调用：`npm run check:entry-graphs`。没有单独测试文件；预算写在脚本顶部的 `BUDGETS` 里。

## 本课目标

读懂文件头那句：**Entry points are cost contracts。** `package.json` 的 `exports` 声明了哪些模块公开。一个不小心的 `export *` 能让「只要一个纯函数」的入口变成求值 37MB 模块图，而且直到有人 profile 才发现。本脚本对选定入口做值导入图的 BFS，超 `maxFiles` 或碰到 `forbid` 路径就失败。

## 在仓库中的位置

目前只给两个包写了预算：

```text
packages/ai
  ./utils/*     max 3 files，禁止碰到 providers/ api/ index.ts

packages/agent
  ./harness/runtime/reducer     max 1
  ./harness/context             max 6，禁止 runtime/ execution/ packages/ai/
  ./harness/env/nodejs          max 5，禁止 ai/ 和 harness/runtime/
  ./harness/session             max 25，禁止 runtime/ execution/ ai/src/index.ts
```

`.` 和 `./node` 这种 batteries-included 入口**故意不设预算**（注释写 unbounded）。要限制的是「号称很窄」的入口。

## 文件做什么

1. 读该包 `exports[entry]`，字符串或 `{ import }` 字段，把 `./dist/foo.js` 映射成 `src/foo.ts`。
2. `*` 通配展开成目录里每个 `.ts`。
3. `walk`：正则扫 `import`/`export` 值导入（负向 lookahead 跳过 `import type` / `export type`），解析相对路径和 `WORKSPACE` 里列出的跨包名。`node:` 和外部 npm 包返回 null，不计入文件数。
4. 图大小 > `maxFiles`：打印每个文件路径。命中 `forbid` 子串：再打一枪。

`WORKSPACE` 只含 chord、pi-ai、pi-agent-core、telemetry、tui。跨到 protocol 的导入会被当成外部而停止走——预算按「源文件数」不是按 node_modules。

## 关键逻辑

只计值导入：`import type { Foo }` 在 Node 求值时擦掉，不该撑爆图。若有人用 `export * from "./fat"` 再 export 类型，值导出仍会把 fat 拉进来——这正是要抓的。

正则 parser 不是完整 TS。模板字符串导入、`require`、`import(foo)` 动态变量会漏。它是便宜的 commit-time 保险丝，不是打包分析器。更重的 treeshake 在 `check-browser-smoke.mjs` 用 esbuild metafile 做。

失败会怎样：

- 在 `harness/context` 里多 import 一个 runtime 模块 → check 红，列出整图。修复：把依赖反过来，或把重的东西动态加载（但 AGENTS.md 不喜欢 inline import，所以更可能是拆文件）
- `exports` 删了某个 entry 但 BUDGETS 还在 → 「declares no export but a budget exists」
- 预算太松：回归要等到图涨过数字。改预算必须当有意识的 contract 变更来审
- 正则漏掉 type 修饰的复杂语句 → 假绿。发现后再收紧正则

## 和启动链的关系

无。影响的是「别人 `import { x } from '@earendil-works/pi-agent-core/harness/context'` 时要付多少启动成本」。CLI 主链走的是宽入口，不靠这些窄预算保证自己瘦——CLI 瘦身是 bundle 脚本的事。

## 下一课

浏览器冒烟的入口夹具：[28-browser-smoke-entry.ts.md](/series/pi-source/root/032-browser-smoke-entry-ts/)。
