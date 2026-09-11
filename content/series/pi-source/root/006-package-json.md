---
title: "02 · package.json — 工作区合同"
summary: "把这份 JSON 当成启动面板来读：workspaces 圈了哪些包、scripts 谁调用谁、为什么 build 不能写成 npm run build --workspaces、check 失败时到底死在哪一环。后面每一课 scrip"
tags: [pi, root]
---
源码：`package.json`  
被谁调用：npm / bun（install、run、version、publish）；CI；husky 的 `npm run check`。**`pi` 进程不读根 package.json。**

## 本课目标

把这份 JSON 当成启动面板来读：workspaces 圈了哪些包、`scripts` 谁调用谁、为什么 `build` 不能写成 `npm run build --workspaces`、`check` 失败时到底死在哪一环。后面每一课 `scripts/*.mjs` 都能在这里找到挂载点。

## 在仓库中的位置

```text
pi-monorepo (private: true, version 0.0.3)
  workspaces:
    packages/*
    packages/session-backends/*
    packages/coding-agent/examples/extensions/{with-deps, custom-provider-*, sandbox, gondolin}
  scripts.*          → 本课逐条
  devDependencies    → 只给仓库工具链，不进发布包
  engines.node       → ">=22.19.0"
  overrides.protobufjs → "7.6.6"
```

`name` 是 `pi-monorepo`，`private: true`。`scripts/local-release.mjs` 会检查 `name === "pi-monorepo"`，防止在子目录误跑发版。根版本 `0.0.3` **不是**产品版本；产品版本锁在各公开包的 `package.json`（当前课表里 coding-agent 是 `0.85.1` 这一档），由 `sync-versions.js` 保证锁步。

`"type": "module"` 让根目录的 `.js` / 被 node 直接跑的 `.mjs` 按 ESM 解析。`scripts/sync-versions.js` 没有 `.mjs` 后缀也能 `import`，靠的就是这一行。

## workspaces 圈了什么

`packages/*` 不会递归进 `packages/session-backends/`，所以 session-backends 单独写了一条。example 扩展里那五个目录自己有 `package.json`（有的带真实依赖），必须进 workspace，否则 `npm install` 不会把它们链进根 `node_modules`，示例文档里的 `pi` 加载扩展会找不到依赖。

**不在 workspace 里的：** `packages/coding-agent/install-lock/`。那是生成的假根，专门给安装器当 lockfile 宿主，`sync-versions.js` 还显式把它排除，避免把内部 `^version` 写进去。

## `scripts`：按调用链，不按字母

### 编译顺序是手写的

```json
"build": "cd packages/chord && npm run build && cd ../tui && ..."
```

不是 `npm run build --workspaces`。原因：包之间有编译期依赖（coding-agent 的 `tsconfig.build.json` 把 `@earendil-works/pi-ai` 指到 `../ai/dist`）。必须 chord → tui → telemetry → ai → agent → sqlite-node → protocol → client → server → coding-agent。写错顺序，后面的包会链到过期的 `dist/` 或不存在的 `.d.ts`。

`build:offline` 只把 `packages/ai` 换成 `build:offline`：不刷新厂家模型目录，用仓库里已有的 `models.generated.ts` 和 `providers/data/`。Release 源码包、断网、以及 `release.mjs` 里「已经 generate:models 过了」的测试构建都走这条。

`build:native:*` 只转发给 `packages/tui`，编 Darwin/Linux/Win32 的 `.node`。独立二进制还要再靠 `build-binaries.sh` 把对应 prebuild 拷进产物。

### `check` 是一条必须全部绿的管子

```text
biome check --write --error-on-warnings .
  → check:pinned-deps
  → check:runtime-deps
  → check:ts-imports
  → check:entry-graphs
  → check:shrinkwrap          # generate-*-shrinkwrap.mjs --check
  → check:install-lock:coding-agent
  → tsgo --noEmit             # 用根 tsconfig.json
  → check:browser-smoke
```

任意一步非零，整条 `check` 失败。husky pre-commit 跑的就是它。`--write` 表示 biome 会改文件（格式化），所以 hook 在成功后再 `git add` 那些原本已 staged 的路径。`--error-on-warnings` 把 warning 升级成失败，和 AGENTS.md「fix all errors, warnings, and infos」对齐。

`tsgo` 来自 `@typescript/native-preview`，不是 `tsc`。根 `devDependencies` 同时钉了 `typescript` 5.9.3（给 `check-ts-relative-imports.mjs` 等脚本 `import ts from "typescript"`）和 native preview（给整仓 noEmit）。

注意：`check` **不含测试**。AGENTS.md 写明改完代码跑 check，不要擅自跑 `npm test` / `npm run build`。

### 测试

```json
"test": "npm run test:scripts && npm run test --workspaces --if-present"
"test:scripts": "node --test scripts/*.test.mjs"
```

先跑根 `scripts/*.test.mjs`（node:test，不是 vitest），再按 workspace 跑各包的 `test`。`./test.sh` 在清空环境后调用的就是 `npm test`。直接在本机敲 `npm test` 会带上你的 API key——那是 AGENTS.md 禁止的原因。

### 版本与发布

```text
version:patch|minor|major
  npm version <x> --workspaces --no-git-tag-version --no-workspaces-update
  node scripts/sync-versions.js
  npm install --package-lock-only --ignore-scripts

prepublishOnly = clean + build + check
publish / publish:dry → scripts/publish.mjs
release:patch|minor|major → scripts/release.mjs   // 这才是维护者按的
release:local → scripts/local-release.mjs
```

`version:*` 只改数字和内部 `^` 依赖，不打 tag。真正打 tag、推 remote、触发 CI 的是 `release.mjs`。`publish` 脚本是给 CI / 手动补发用的「已经 bump 完了，把包推上 npm」。

`prepare`: `husky`。`npm install` 时会装 git hook。所以 README 才强调 `--ignore-scripts`：CI 和用户安装不要跑这条。开发者本机第一次 install 若带 `--ignore-scripts`，hook 不会就位，需要自己再跑一次 `npm run prepare` 或不用该 flag——这是「开发者本机」和「CI/用户」的分叉，故意的。

### 模型目录相关

`generate:models`、`hydrate:model-data`、`check:model-data`、`generate:model-catalog` 都转发到 `packages/ai`。根上只留 `diff:model-catalog` 和 `check:model-catalog`（dry-run 发布脚本），因为它们跨包、而且要和 git HEAD 对比。

## 关键逻辑

### 为什么依赖全是精确版本

```json
"devDependencies": {
  "@biomejs/biome": "2.3.5",
  "esbuild": "0.28.2",
  ...
}
```

没有 `^`。`.npmrc` 的 `save-exact=true` 保证以后 `npm i -D foo` 也写下精确版本。`check-pinned-deps.mjs` 扫描**所有** `package.json`（含 packages/*），内部 `@earendil-works/pi-*` 和 `chord` 允许 `^`，外部不允许。失败 = `check` 红 = 提交被拒。

`overrides.protobufjs = 7.6.6` 把传递依赖也钉死。shrinkwrap 白名单里同样出现 `protobufjs@7.6.6`（它有 postinstall，但只是警告版本 scheme）。

### engines

`node >= 22.19.0` 和 bundle 的 `target: "node22.19"`、tsconfig `ES2022` 对齐。低版本 Node 上 `tsx` / strip-only 语法 / 某些 `node:` API 会 silently 坏掉。独立二进制用 Bun compile，不走这条 engines，但源码开发和 npm 包走。

## 失败会怎样

| 字段/脚本坏了 | 现象 |
|---|---|
| workspaces 漏了一个带依赖的 example | 示例扩展 `npm i` 后缺包，文档里的路径跑不起来 |
| `build` 顺序写错 | 后编的包 resolve 到旧 dist 或找不到类型 |
| `check` 中某一环 exit 1 | pre-commit 失败；CI Check 步失败；`release.mjs` 在 bump 之后卡死，可能已经改了版本号但没 tag |
| 有人把根 `private` 去掉 | 有人可能把 `pi-monorepo@0.0.3` 发到 npm——无意义且危险，所以保持 private |
| 漏掉 `overrides` | 传递依赖 protobufjs 漂到带真实 postinstall 的版本，和 shrinkwrap 白名单对不上，`check:shrinkwrap` 红 |

## 和启动链的关系

不进 `main.ts`。但 `./pi-test.sh` 依赖根 `node_modules/.bin/tsx`，而 tsx 是这份 `devDependencies` 装进来的。没在根 `npm install` 过，源码入口会立刻找不到二进制。

`npm run build` 的最后一跳是 coding-agent 的 `build`，它会再调 `scripts/build-coding-agent-bundle.mjs`，产出 `dist/bundle/cli.js`。`scripts/auto-pi.sh` 和 npm 上的 `bin.pi` 都指向这份产物。

## 下一课

合同旁边是给仓库里 agent 看的规矩：[03-AGENTS.md.md](/series/pi-source/root/007-AGENTS-md/)。
