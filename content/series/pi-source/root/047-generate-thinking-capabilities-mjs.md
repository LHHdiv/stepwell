---
title: "43 · generate-thinking-capabilities.mjs — 把思考等级投影成 JSON"
summary: "模型目录 JSON 很大，thinkingLevelMap 和「实际支持哪些等级」分散在 getSupportedThinkingLevels(model) 里。本脚本读一份 catalog，对每个 provider 写出 provid"
tags: [pi, root]
---
源码：`scripts/generate-thinking-capabilities.mjs`  
被谁调用：`diff-model-catalog.mjs --thinking` 对 HEAD 和工作树各跑一次。不是 npm script，不是 CI 门。

## 本课目标

模型目录 JSON 很大，`thinkingLevelMap` 和「实际支持哪些等级」分散在 `getSupportedThinkingLevels(model)` 里。本脚本读一份 catalog，对每个 provider 写出 `providers/<id>.json`：`{ levels, values? }`。`values` 只在 map 的值 **不等于** 等级名时出现，减少噪声。这样 `git diff` 两棵树能看出「这次改动是否改变了用户可选手柄」，而不是整份模型元数据。

## 在仓库中的位置

```text
node scripts/generate-thinking-capabilities.mjs <catalog-path> <output-dir>
  catalog = JSON.parse
  动态 import ../packages/ai/src/models.ts 的 getSupportedThinkingLevels
  每个 provider → output-dir/providers/<provider>.json
```

缺参数 throw Usage。`mkdirSync(providers, { recursive: true })`。

它 import **源码** `packages/ai/src/models.ts`。对 HEAD 的 catalog 做投影时，`diff-model-catalog.mjs` 会把**当前工作树的本脚本** copy 进 detached worktree，但 `getSupportedThinkingLevels` 仍来自那份 worktree 的 `packages/ai`——因为 node 的模块路径相对脚本；copy 脚本到 worktree 后 `../packages/ai` 指向 worktree 的 ai。这正是 `--thinking` 文档说的「用那份 worktree 的实现」。

## 文件做什么

```js
levels = getSupportedThinkingLevels(model)
values = 那些 thinkingLevelMap[level] !== undefined && !== level 的项
输出 { levels, values } 或仅 { levels }
```

没有模型循环的错误处理：catalog 形状不对会在 `Object.entries` 或 getSupported 里炸，diff 脚本捕获后当命令失败。

## 关键逻辑

失败会怎样：

- catalog 不是 `{ provider: { modelId: model } }` → 运行期 TypeError
- `getSupportedThinkingLevels` 改了语义：同一 catalog 的投影变了，`--thinking` diff 会显示大量变化。这是想要的
- 没人单独跑本脚本做发版；它坏了只影响维护者看 diff 的能力，不挡 check

## 和启动链的关系

无。运行时用的是 `models.ts` 里的函数本身，不读本脚本生成的 JSON。

## 下一课

把 HEAD 和工作树的目录对着 diff：[44-diff-model-catalog.mjs.md](/series/pi-source/root/048-diff-model-catalog-mjs/)。
