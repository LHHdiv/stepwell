---
title: "08 · tsconfig.base.json — 所有编译配置的共同底座"
summary: "记住两句就够往下读源码："
tags: [pi, root]
---
源码：`tsconfig.base.json`  
被谁调用：各包 `tsconfig.build.json` / `tsconfig.test.json` 的 `"extends"`；根 `tsconfig.json` 也 extends 它。`tsc` / `tsgo` / 各包 `npm run build` 间接读取。

## 本课目标

记住两句就够往下读源码：

1. **模块系统是 Node16/NodeNext，相对导入必须带扩展名。**
2. **语法必须是 Node strip-only 可擦除的**（`erasableSyntaxOnly: true`）。

`tui-plan.md` 里「不要用参数属性」不是审美，是这条配置在挡。

## 在仓库中的位置

```text
tsconfig.base.json          ← 编译选项（无 include）
  ├─ tsconfig.json          根 noEmit + paths 到 src（下一课）
  ├─ packages/*/tsconfig.build.json   outDir: dist, paths 到其它包的 dist
  └─ 若干 tsconfig.test.json
```

base **没有** `include` / `files`。单独拿它调用编译器等于没有输入。它只是一份 `compilerOptions` 字典。

## 文件做什么（逐项）

### 语言与模块

- `target` / `lib`: `ES2022`。和 `engines.node >= 22.19` 匹配。不要在源码里用 ES2023 才有的运行时 API 而不检查 Node 版本。
- `module` + `moduleResolution`: `Node16`。含义：每个文件按自己的 `"type"` / 扩展名决定 CJS/ESM；相对导入要写 `./foo.ts` 或（在旧风格里）`./foo.js`。本仓库选择写 `.ts`，靠下面两个选项在 emit 时改回 `.js`。
- `allowImportingTsExtensions: true` — 允许 `import { x } from "./foo.ts"`。
- `rewriteRelativeImportExtensions: true` — emit 到 `dist/` 时把 `.ts` 改写成 `.js`，这样 Node 跑编译产物不必懂 `.ts`。

这就是为什么存在 `scripts/update-source-imports-to-ts.sh` 和 `check-ts-relative-imports.mjs`：源码侧禁止相对 `.js` 导入，统一 `.ts`；输出侧由编译器改写。两条规则一起，才不会出现「源码写 `.js` 但文件是 `.ts`，tsx 和 tsc 各走各的」。

### 可擦除语法

`erasableSyntaxOnly: true` 禁止：

- constructor 参数属性（`constructor(private x: T)`）
- `enum` / `namespace` / `module`
- `import =` / `export =`

AGENTS.md 把同一句话写给 agent。`pi-test.sh` 用 tsx 跑源码，tsx 走 Node 的 strip types；这些语法需要真正的 TS emit 才能变成 JS，strip 会留下非法 JS。打开这个选项是为了 **源码路径和 dist 路径语义接近**。

`experimentalDecorators` + `emitDecoratorMetadata` + `useDefineForClassFields: false` 仍开着，给少数装饰器遗留（若有）和 class field 的旧赋值语义。新代码不要靠装饰器设计 API。

### 产物质量

`declaration` / `declarationMap` / `sourceMap` / `inlineSources`：发布到 npm 的 `.d.ts` 能跳回 `.ts`。`inlineSourceMap: false` 表示 source map 是旁路 `.map` 文件，不塞进 `.js`——调试独立二进制时不一定有这些 map，那是 Bun compile 的另一条路。

`strict: true`、`forceConsistentCasingInFileNames: true`、`skipLibCheck: true`。后者跳过 `.d.ts` 检查，否则 `@types/node` 和某些 SDK 的冲突会把 check 打红，而那些错误你改不了。

`esModuleInterop` + `resolveJsonModule`：允许默认导入 CJS、以及 `import data from "./x.json"`。`check-runtime-deps` 的测试专门覆盖了「JSON 资源不在 include 里但运行时要带上」的情况。

`types: ["node"]`：全局只有 Node 类型，没有 DOM。浏览器相关包必须自己在文件里引用，或依赖 `check-browser-smoke` 用 esbuild `platform: browser` 来抓 Node 内置导入。

## 关键逻辑

base 和根 `tsconfig.json` 的差异是本课的考点：

| | base / 各包 build | 根 tsconfig.json |
|---|---|---|
| 目的 | emit `dist/` | `noEmit` 类型检查整仓源码 |
| module | Node16（base） | NodeNext（根覆盖） |
| paths | 指向**其它包的 dist .d.ts** | 指向**各包 src** |
| 谁用 | `npm run build` | `tsgo --noEmit`、tsx `--tsconfig` |

开发时 `./pi-test.sh` 传的是根 `tsconfig.json`，所以 tsx 按 **src alias** 解析 `@earendil-works/pi-ai`。发版编译按 **dist 类型**解析，保证用户安装后看到的公共 API 和你本地 `tsc` 的是同一份声明。两条 paths 故意不同；改错一边会出现「本地绿、build 红」或反过来。

失败会怎样：

- 关掉 `erasableSyntaxOnly` → 有人写下参数属性，`pi-test.sh` 在 strip-only 下运行崩溃，报一堆 SyntaxError，和类型错误无关
- 源码相对导入写成 `.js` → `check:ts-imports` 红
- 某包 build tsconfig 不 extends base → 可能 emit 出不带 `.js` 改写的导入，Node 加载 dist 失败
- `skipLibCheck: false` → 第三方 typings 噪声淹没真实错误

## 和启动链的关系

`pi-test.sh`：

```bash
tsx --tsconfig "$SCRIPT_DIR/tsconfig.json" .../experimental/cli.ts
```

tsx 用根配置（extends 本文件 + paths）。不直接读 base，但根没有重复写 `strict` / `erasableSyntaxOnly`，全靠 extends。

## 下一课

根类型检查和 alias 地图：[09-tsconfig.json.md](/series/pi-source/root/013-tsconfig-json/)。
