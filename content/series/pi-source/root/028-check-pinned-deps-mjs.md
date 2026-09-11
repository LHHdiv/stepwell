---
title: "24 · check-pinned-deps.mjs — 外部依赖必须是精确版本"
summary: "能判断一条 specifier 会不会被打红：1.2.3 过，^1.2.3 红，workspace: 过，@earendil-works/pi-ai 过，npm:foo@1.2.3 过（看 @ 后面那截）。这是 .npmrc save-"
tags: [pi, root]
---
源码：`scripts/check-pinned-deps.mjs`  
被谁调用：`npm run check:pinned-deps`，挂在 `npm run check` 上。husky 因此每次提交都跑。

## 本课目标

能判断一条 specifier 会不会被打红：`1.2.3` 过，`^1.2.3` 红，`workspace:*` 过，`@earendil-works/pi-ai` 过，`npm:foo@1.2.3` 过（看 @ 后面那截）。这是 `.npmrc` `save-exact` 的审计补丁。

## 在仓库中的位置

从 cwd 递归收集所有名为 `package.json` 的文件，跳过 `.git` / `dist` / `node_modules`。所以会扫到：根、每个包、example 扩展、install-lock、甚至文档示例里的 package.json（若文件名精确匹配且不在跳过目录）。

## 文件做什么

对每个文件的 `dependencies` / `devDependencies` / `optionalDependencies`：

```text
若名字是 @earendil-works/pi-* 或 @earendil-works/chord → skip
若 specifier 以 workspace: file: link: portal: git+ github: git: http(s): ssh: git:// 开头 → skip
取出 npm: alias 的版本尾巴
若匹配精确 semver（可带 pre-release / build metadata）→ ok
否则 failures.push("file: section.name must be pinned, found X")
```

`peerDependencies` 不扫。peer 本来就是范围。

精确版本正则是完整 semver，不含 `>`、`~`、`^`、`*`、`latest`。`1.2` 这种两段也不过。

## 关键逻辑

内部包用 `^` 是 lockstep + workspace 链接的需要，外部包用精确版本是为了让 **package.json 自身**就是审查对象：你看到 `"esbuild": "0.28.2"` 就知道不是「当时 lock 碰巧解析到 0.28.2」。lockfile 仍然是传递依赖真值。

失败会怎样：

- agent 或人写了 `"foo": "^1.0.0"` → check 红，commit 停。修复：改成精确版本并跑 `npm install --package-lock-only --ignore-scripts`，再 `PI_ALLOW_LOCKFILE_CHANGE=1` 提交
- 新内部包不叫 `pi-` 前缀也不叫 chord（例如将来 `@earendil-works/widget`）→ 会被要求精确版本，workspace 链接可能别扭。那时要改 `internalPackageNames`
- 扫到 example 里故意写的范围版本 → 必须改 example 或把该目录排除。当前 example 扩展在 workspace 里，同样被钉死，这是好事（演示依赖也是供应链）

脚本没有 `--fix`。不会帮你改文件。

## 和启动链的关系

无。它保证你本地 `node_modules` 和 CI 装到同一套直接依赖，从而 tsx 跑源码时加载的 `@anthropic-ai/sdk` 等与发版时一致。

## 下一课

更严的一刀：源码 import 必须在 package.json 里声明：[25-check-runtime-deps.mjs.md](/series/pi-source/root/029-check-runtime-deps-mjs/)。
