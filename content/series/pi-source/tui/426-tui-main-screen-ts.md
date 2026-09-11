---
title: "04 · tui-main-screen.ts — 主屏差量渲染"
summary: "能走 doRender：组件行 → overlay 合成 → 找首尾脏行 → 只 rewrite 那段。能解释 Kitty 图为何要扩脏区间、宽度变化为何全清、Termux 高度变化为何故意不全清。"
tags: [pi, tui]
---
源码：`packages/tui/src/tui-main-screen.ts`  
被谁调用：默认交互、启动 UI、config selector。

## 本课目标

能走 `doRender`：组件行 → overlay 合成 → 找首尾脏行 → 只 rewrite 那段。能解释 Kitty 图为何要扩脏区间、宽度变化为何全清、Termux 高度变化为何故意不全清。

## 在系统中的位置

```text
TuiBase.requestRender → TuiMainScreen.doRender
  newLines = this.render(width)           Container 垂直拼接
  compositeOverlays
  extractCursorPosition（找 CURSOR_MARKER）
  applyLineResets
  与 previousLines 比较
    无历史 / 宽变 /（高变且非 Termux）/ clearOnShrink
      → fullRender（CSI 2026 + 可选 2J 3J）
    否则移动光标到 firstChanged，逐行写，清多出来的行
```

`mode = "regular"`。输出进主缓冲，终端自己滚历史。

## `BoundedTerminalWriter`

单次 `doRender` 可能拼出超过 V8 字符串上限的输出。1MiB 一块 flush，不在代理对边界切开。调用方自己包 2026h/l。

## `doRender` 决策

1. **第一次**（previousLines 空且尺寸没变）：fullRender(false)——假定屏幕干净，不清滚动历史。
2. **宽度变**：wrapping 全变，fullRender(true) 清屏+清 scrollback（`2J H 3J`）。
3. **高度变**：通常 fullRender(true)。**Termux 除外**：软键盘改 rows，全重绘会把历史重放一遍。
4. **clearOnShrink** 且变矮且无 overlay：fullRender(true) 清空行。
5. 否则算 `firstChanged`/`lastChanged`。纯追加且没改旧行：从旧末尾接着写。Kitty 图占多行：`expandChangedRangeForKittyImages` 把脏区间扩到整块，避免只重画一半把图撕开。改图前 `deleteKittyImage` 旧 id。

无脏行：只 `positionHardwareCursor`。

删行过多（`extraLines > height`）或目标行滚出视口：退回 fullRender。差量只能碰**当前可见**区域。

## Kitty 占位

图行带 `\x1b_G` 参数 `i=` id、`r=` 行数。`getKittyImageReservedRows` 看后面多少空行属于这张图。fullRender 先下移占位再上移画图，光标会计仍正确。

`captureRenderState` / `restoreRenderState`：Main↔Alt 切换时 InteractiveMode 把差量状态带走。restore 时 image 行变成 `""`（id 已无意义）。

## `beforeTerminalStop`

非 preserveScreen：写一个空格、把硬件光标移到内容末行、`\r\n`。下一行 shell 提示才不会覆盖最后一行 UI。

## 失败与边界

- `PI_TUI_DEBUG_REDRAW=1` 往 logDirectory 写为何 fullRender。
- overlay 合成在差量之前，所以弹层也走同一套脏行。
- 图像行 `isImageLine` 为真时不要当普通文本截断。
- previousWidth 初值 0，用 `-1` 在 reset 时强制下一帧当尺寸变化。

## 下一课

[05-tui-alt-screen.ts.md](/series/pi-source/tui/427-tui-alt-screen-ts/)：备用屏上的应用滚动视口。
