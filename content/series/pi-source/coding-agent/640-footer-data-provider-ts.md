---
title: "93 · footer-data-provider.ts — 页脚的 git 分支"
summary: "findGitPaths：向上找 .git。目录 = 普通仓库；文件 gitdir: = worktree，再读 commondir。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/footer-data-provider.ts`  
被谁调用：交互 footer；`loadProjectContextFiles` 用 `findGitPaths` 判断 worktree 阴影。

`findGitPaths`：向上找 `.git`。目录 = 普通仓库；文件 `gitdir: ` = worktree，再读 `commondir`。

`FooterDataProvider`：watch HEAD，更新 branch；扩展 `setStatus` 的键值也放这里给自定义 footer。`ReadonlyFooterDataProvider` 是 footer 工厂能碰的子集。git 调用带 `--no-optional-locks`，避免挡用户 git。

## 下一课

[94-keybindings.ts.md](/series/pi-source/coding-agent/642-keybindings-ts/)。
