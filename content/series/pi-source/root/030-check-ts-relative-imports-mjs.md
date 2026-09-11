---
title: "26 · check-ts-relative-imports.mjs — 禁止相对 `.js` 导入"
summary: "知道源码里只能写 from \"./foo.ts\"，不能写 from \"./foo.js\"。旧 TypeScript 习惯是源文件叫 foo.ts、导入写 .js（对应 emit 产物）。本仓库反过来：源码写真相，emit 时再改写。本脚"
tags: [pi, root]
---
源码：`scripts/check-ts-relative-imports.mjs`  
被谁调用：`npm run check:ts-imports`。配合 `tsconfig.base.json` 的 `allowImportingTsExtensions` + `rewriteRelativeImportExtensions`，以及一次性迁移脚本 `update-source-imports-to-ts.sh`。

## 本课目标

知道源码里只能写 `from "./foo.ts"`，不能写 `from "./foo.js"`。旧 TypeScript 习惯是源文件叫 `foo.ts`、导入写 `.js`（对应 emit 产物）。本仓库反过来：源码写真相，emit 时再改写。本脚本用 TypeScript parser 保证没有人把旧习惯带回来。

## 在仓库中的位置

从 cwd `.` 递归收集所有 `.ts` 且非 `.d.ts`，跳过 `.git` / `coverage` / `dist` / `node_modules`。**会扫到 `scripts/*.ts` 和 examples。** 比 biome 的 include 更宽。

## 文件做什么

对每个文件 `ts.createSourceFile`，visit：

- `import ... from "./x.js"`
- `export ... from "./x.js"`
- 动态 `import("./x.js")`
- `import("./x.js").Foo` 这种 `ImportType`

相对路径定义为 `^\.\.?/` 且以 `.js` 结尾（允许 `?`/`#` 后缀）。`foo.js` 不带 `./` 不算相对，不会报——那是裸模块名，极少见。

失败列表打印 `file:line:col: specifier`，有任一条 `exit 1`。没有自动修复；批量修复是 `scripts/update-source-imports-to-ts.sh`（perl 改 `from`/`import`/`declare module`/`importNodeOnlyProvider(`）。

## 关键逻辑

tsx 跑 `./foo.ts` 时，若源码写 `from "./bar.js"` 而磁盘上只有 `bar.ts`，解析器要靠「猜测 js→ts」的兼容层。不同工具（tsx、tsgo、vitest、Node 原生 strip）猜测规则不完全相同。统一写 `.ts` 后，行为只剩一种：找同名 ts，build 再改写成 js。

`.d.ts` 被跳过：声明文件里的 `from "./foo.js"` 描述的是 JS 模块图，改写会误伤 `@types` 风格。

失败会怎样：

- 从网上复制了 `from "./x.js"` → check 红。人改成 `.ts` 即可
- 生成器输出了 `.js` 导入 → 生成器要修，不要在生成物上手改（models.generated 已被 biome ignore，但本脚本若扫到它仍会红——`models.generated.ts` 在 packages/ai/src 下会被扫）
- 动态拼接 `import("./" + name + ".js")`：字面量检查看不到，漏网。AGENTS.md 禁止 inline import，减少这种洞

## 和启动链的关系

直接关系：`pi-test.sh` 的 tsx 按这些 specifier 找文件。写错扩展名，源码入口第一批 import 就会挂。

## 下一课

入口模块图预算：[27-check-entry-graphs.mjs.md](/series/pi-source/root/031-check-entry-graphs-mjs/)。
