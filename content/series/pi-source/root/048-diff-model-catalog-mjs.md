---
title: "44 · diff-model-catalog.mjs — 这次改动动了哪些模型"
summary: "流程：git worktree add --detach 一份 HEAD → 在两边跑 packages/ai/scripts/generate-models.ts --strict --json-only → 规范化 JSON → 按"
tags: [pi, root]
---
源码：`scripts/diff-model-catalog.mjs`  
被谁调用：`npm run diff:model-catalog`。给人看的工具，CI 主路径不用。改 `packages/ai` 生成器或厂家 JSON 时，用它代替肉眼扫 `models.generated.ts`。

## 本课目标

流程：`git worktree add --detach` 一份 HEAD → 在两边跑 `packages/ai/scripts/generate-models.ts --strict --json-only` → 规范化 JSON → 按 provider/model 做 `git diff --no-index --word-diff`。`--thinking` 则再跑 43 课脚本，只比有效思考等级。

## 在仓库中的位置

```text
临时目录
  baseline-worktree   HEAD 只读树，symlink 当前 node_modules
  before/ after/      生成的 catalog
  把当前仓库的 generate-thinking-capabilities.mjs copy 进 baseline
                      （保证脚本存在；实现仍用各树自己的 models.ts）
```

`requestedProviders` 可限制范围。两边都没有该 provider → throw Unknown provider。

退出时 `git worktree remove`（脚本后半，用 try/finally 里的 `worktreeAdded` 标志）。node_modules 是 symlink/junction，不要递归删真实的根 node_modules。

## 文件做什么

`canonicalizeJson` 对普通键排序，对 `thinkingLevelMap` / `values` 按 `off…max` 等级序排，避免「键顺序变化」假 diff。

`formatJsonForDiff` 自定义 pretty（尾逗号风格）再交给 `git diff --word-diff`，只把 `+/-` 行打到 stdout。一个模型没变化就 skip。最后汇总 changedModels 计数。

HEAD 侧 `generateCatalog` 不 pretty，当前树 pretty——formatProviderCatalogs 随后两边都规范化，消除 pretty 差异。

未知以 `-` 开头的参数当 help 并 exit 1。

## 关键逻辑

失败会怎样：

- generate-models 需要网络或 data：HEAD worktree 只有 symlink 的 node_modules，data 目录若只在当前树且被 ignore，HEAD 侧可能用旧生成逻辑 + 缺 JSON。这是工具限制：它比的是「生成器代码 + 能看见的输入」
- worktree add 失败（已有同路径、git 锁）：throw，可能留下临时目录。finally 应清理
- Windows junction：`symlinkSync(..., "junction")`
- 把结果当测试快照：输出含颜色码，脚本在过滤 `+/-` 时 strip ANSI。管道到文件仍可能有转义

## 和启动链的关系

无。帮助你审查「用户下一次 hydrate/启动会看到哪些模型差」。

## 下一课

日常把构建产物挂到 PATH：[45-auto-pi.sh.md](/series/pi-source/root/049-auto-pi-sh/)。
