---
title: "36 · tool-execution.ts — 一次工具调用的外壳"
summary: "不订 session。InteractiveMode 调："
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/tool-execution.ts`  
谁创建：流式 `message_update` 见到新 toolCall；`tool_execution_start` 兜底；历史重放配对。

## 订阅什么

不订 session。InteractiveMode 调：

- `updateArgs` — 参数还在流
- `markExecutionStarted`
- `setArgsComplete` — 参数定稿，edit 类开始算 diff
- `updateResult(result, isPartial)`
- `setExpanded`

组件内：结果区左键切换展开。工具自己的 `renderCall`/`renderResult` 可通过 `context.invalidate()` 请求重绘。

## 画什么

三种壳：

1. **有 definition 且 `renderShell: "self"`**：工具自己画边框，放进 `selfRenderContainer`。
2. **有 definition 默认壳**：`Box`，底色 pending 黄 / success 绿 / error 红。里面是 `renderCall` + `renderResult`。
3. **无 definition**：`Text` 粗体工具名 + 截断输出（默认 10 行），提示 `app.tools.expand`。

结果里的图片：设置允许则 `Image` 组件（先 `convertToPng` 给 kitty）；禁止则占位。`hideComponent` 可让工具选择完全不画（某些 noiseless 工具）。

## 失败与边界

- `rendererState` 是任意对象，同一 toolCall 生命周期内保留，供 diff 组件缓存。
- 参数 JSON 流式不完整时 renderCall 必须能接受半截 args。
- 本组件**不执行**工具。

## 下一课

[37-bash-execution.ts.md](/series/pi-source/coding-agent/528-bash-execution-ts/)
