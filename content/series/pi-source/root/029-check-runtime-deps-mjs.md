---
title: "25 · check-runtime-deps.mjs — 公开包不能偷用未声明依赖"
summary: "理解它抓的两类发布事故："
tags: [pi, root]
---
源码：`scripts/check-runtime-deps.mjs`  
被谁调用：`npm run check:runtime-deps`。测试：`scripts/check-runtime-deps.test.mjs`（`npm run test:scripts`）。

## 本课目标

理解它抓的两类发布事故：

1. 源码 `import "foo"` 但 `foo` 只在根或 devDependencies 里——本地能跑（hoist），用户 `npm i @earendil-works/pi-coding-agent` 后炸。
2. `tsconfig.build.json` exclude 了 `src/experimental`，但公开入口 `export * from "./experimental/server"` 又把它拉回编译图——exclude 形同虚设。

issue **#9132** 就是这类：workspace 把所有包都装上，掩藏了缺失的 runtime 依赖。

## 在仓库中的位置

```text
对 getPublicWorkspacePackages() 的每个包:
  读 tsconfig.build.json（没有则 include src/**/*）
  ts.createProgram(...)
  每个非 d.ts 源文件:
    若相对 src 却不在 parsed.fileNames（被 exclude 又被 import 拉进来）→ 失败
    扫描值 import / export / import() / require / require.resolve
    类型-only 跳过
```

private 包（evals、examples）不扫。测试和 `.d.ts` 不扫。

## 文件做什么

### 什么叫「已声明」

`manifest.name` 自己 + `dependencies` + `optionalDependencies` + `peerDependencies` 的键。`devDependencies` **不算**。所以测试专用的包可以出现在 devDependencies，但 src 里不能 import。

内置模块 `isBuiltin(specifier)` 和相对路径跳过。包名切段：`@scope/name/...` 取两段，其余取一段。`@earendil-works/pi-server/unix` 的名字是 `@earendil-works/pi-server`。

### 类型导入的判断

只有整句都是 type-only 才跳过：`import type { T } from "x"`、`import { type T } from "x"`（所有 named 都是 type）、`export type { T } from "x"`。混入一个值绑定就算运行时依赖。空的 `import "side-effect"`、`import {} from "x"` 也算——可能有副作用。

动态 `import("x")`、`require("x")`、`require.resolve("x")` 一律当运行时。这和 AGENTS.md「禁止 inline import」叠加：即使你写了动态 import 绕 biome，本脚本仍要求声明。

### exclude 洞

TypeScript 的 `exclude` 只影响根文件列表，被 include 的文件 import 进来的模块仍进 program。脚本对「在 src 下但不在 `parsed.fileNames`」报 `is excluded from X's build but imported by it`。于是 `export * from "./experimental/server"` 和 `import type { Options } from "./experimental/server"` 都会红——类型导入也会把文件拉进编译，发布的 `.d.ts` 可能引用不存在的模块。

JSON 资源：测试表明 `import "./data.json"` 且 tsconfig `resolveJsonModule` 时允许，因为 JSON 通常不在 `fileNames` 的 ts include 里……实际测试期望 status 0，脚本对 JSON 在 `source.fileName.endsWith(".json")` 处 `continue`，不检查 exclude。

## 关键逻辑

本地 workspace 永远装得比用户全。本脚本假装自己是「只装了 package.json 里那几行依赖的用户」，用类型图近似运行时图。近似失败点：条件编译、真正运行不到的 dead import 仍会要求声明——偏保守，符合发版。

失败会怎样：

- 漏声明 → check 红。修复：加到该包 dependencies（精确版本），再 shrinkwrap
- 从 devDependencies 挪到 dependencies 会增大用户安装面。若那包其实只给 experimental 用，正确修复是切断公开入口对它的 import，而不是加依赖。consumer smoke 会再验 `pi-server` 不得出现在安装树
- 脚本 throw（tsconfig 读失败）→ check 整条死，比普通 failures 列表更硬

## 和启动链的关系

无直接关系。它保证 npm 上的 `pi` 启动时，Node 解析 `import "jiti"` 能在 CLI 包的 node_modules 里找到。源码路径 `pi-test.sh` 靠根 hoist，即使漏声明本地也能跑——这就是为什么必须有本检查。

## 测试

`check-runtime-deps.test.mjs` 在临时目录写假 `packages/example`：

- 未声明 `@earendil-works/pi-server/unix` 即使 workspace 里有 server 包 → status 1（#9132）
- 声明、builtin、相对路径、纯类型 → 0
- dev-only、副作用 import、混合 export、`import()`/`require` → 1 且 stderr 含每个名字
- JSON 资源 → 0
- exclude 目录里的文件单独存在 → 0；被入口 export/import type 拉进来 → 1
- 测试文件、d.ts、private 包 → 忽略

## 下一课

相对导入必须写 `.ts`：[26-check-ts-relative-imports.mjs.md](/series/pi-source/root/030-check-ts-relative-imports-mjs/)。
