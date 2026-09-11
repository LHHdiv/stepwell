---
title: "10 · vitest.base.ts — 测试里把包名指回源码"
summary: "看清测试进程如何在「没做 npm link」的情况下 import @earendil-works/pi-ai 却执行到 packages/ai/src。它和根 tsconfig.json 的 paths 是同一意图的 Vite 版：一"
tags: [pi, root]
---
源码：`vitest.base.ts`  
被谁调用：目前 `packages/coding-agent/vitest.config.ts`、`packages/evals/vitest.config.ts`、`packages/evals/vitest.test.config.ts` 通过 `mergeConfig` 引入。其它包（agent、ai、tui…）有自己的 `vitest.config.ts`，**不 extends 这份**。

## 本课目标

看清测试进程如何在「没做 npm link」的情况下 import `@earendil-works/pi-ai` 却执行到 `packages/ai/src`。它和根 `tsconfig.json` 的 `paths` 是同一意图的 Vite 版：一份源码，两套解析器。

## 在仓库中的位置

```text
./test.sh → env -i npm test
  npm run test:scripts          node --test scripts/*.test.mjs   （不读本文件）
  npm run test --workspaces
      packages/coding-agent/vitest.config.ts
        import base from "../../vitest.base.ts"
        mergeConfig(base, { test: { env: { PI_OFFLINE: "1" }, ... } })
```

`fileURLToPath(new URL("./packages/...", import.meta.url))` 按**本文件所在位置**（仓库根）解析绝对路径。各包 config 从 `packages/foo/` 引用它时，alias 仍然指向根下的 src，不会变成 `packages/foo/packages/ai/...`。

## 文件做什么

### `workspaceSourcePaths`

一个对象，列出每个公开入口对应的源文件绝对路径：chord 的 index/context/delta/bundler/node、telemetry、ai 的 index/compat/oauth/providers 目录、agent 的 index/node、protocol、client、server、coding-agent index、tui index。

这张表必须和包的 `package.json#exports` 对得上。少一条，测试里 `import x from "@earendil-works/pi-ai/oauth"` 就会落到 `node_modules` 的 dist。多一条只是死字段。

注意：`codingAgentIndex` 写了但 default export 的 `alias` 数组里**没有** `@earendil-works/pi-coding-agent`。coding-agent 的 vitest config 自己补了 `pi-ai` / `pi-agent-core` / 旧名 `@mariozechner/*` 的 alias。本文件给「被测包去依赖其它工作区包」用；coding-agent 测自己时直接走相对 `src/`，不需要把自己 alias 进来。

### `resolve.alias`

用正则精确匹配包名，避免 `@earendil-works/pi-ai` 误伤 `@earendil-works/pi-ai-foo`：

```ts
{ find: /^@earendil-works\/pi-ai$/, replacement: workspaceSourcePaths.aiIndex },
{ find: /^@earendil-works\/pi-ai\/providers\/(.+)$/, replacement: `${...aiProviders}/$1.ts` },
```

providers 子路径被改写成 `packages/ai/src/providers/<id>.ts`。测试若 `import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic"`，和 `scripts/agent-treeshake-smoke-entry.ts` 的写法一致。

没有列入的外部依赖（`undici`、`@anthropic-ai/sdk`）仍走 `node_modules`。

## 关键逻辑

Vitest 用 Vite 解析器，**不读** `tsconfig.json` 的 `paths`（除非额外插件）。只配 tsconfig、不配 vitest alias，会出现：

- `tsgo` 绿（看 src）
- vitest 加载 dist 或解析失败
- 你改了 `packages/ai/src` 的 bug 修复，coding-agent 测试还在打旧 dist

反过来，只改 vitest.base 不改 tsconfig paths，IDE 和 tsx 会分叉。新增一个公开子路径时要改**三处**：包 `exports`、根 `tsconfig.json` paths、本文件 alias（若测试会 import）。

失败会怎样：

- alias 指错文件（指到 `dist/`）→ 测试不是在测你刚改的源码，CI 仍可能绿，直到有人 clean
- coding-agent 测试依赖 chord 但本文件漏了 chord → 可能误用已安装版本
- 其它包不 merge 这份 config：它们测试内部模块用相对导入，跨包则可能走 workspace 链接的 dist。这是历史分叉。读 agent 包测试时不要假设 vitest.base 生效

`packages/coding-agent/vitest.config.ts` 在 merge 之后还设 `env: { PI_OFFLINE: "1" }`，即使你本机有 API key，vitest 默认也不打网。`./test.sh` 再把 HOME 指到临时目录，双保险。e2e 要显式 `allowNetwork()`。

## 和启动链的关系

不在 `pi-test.sh` 链上。在 `./test.sh` → `npm test` → vitest 链上。产品进程和测试进程共享同一份源码，靠 tsconfig paths 和本文件两套 alias 分别接通。

## 下一课

哪些生成物不准进 git：[11-.gitignore.md](/series/pi-source/root/015--gitignore/)。
