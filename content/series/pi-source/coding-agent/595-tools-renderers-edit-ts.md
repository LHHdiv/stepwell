---
title: "70 · renderers/edit.ts — edit 的 diff 视图"
summary: "renderShell: \"self\" 配套：自己画标题和 diff，不套默认工具框。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/tools/renderers/edit.ts`

`renderShell: "self"` 配套：自己画标题和 diff，不套默认工具框。

`EditRenderState` 缓存按宽度折行的 diff 行。`details.diff` 来自 execute 成功路径。失败时没有 details，显示错误文本。`firstChangedLine` 给「在编辑器打开」类快捷键（组件层）。

流式：edit 不 onUpdate 中间状态，只有开始/结束。

## 下一课

[71-tools-renderers-bash.ts.md](/series/pi-source/coding-agent/597-tools-renderers-bash-ts/)。
