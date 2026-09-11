---
title: "02 · tui.ts — 接口、Container、start/stop"
summary: "把 TuiBase.start / stop / requestRender / handleTerminalInput 画成一张图。能指出 overlay 栈如何抢焦点、CURSORMARKER 干什么、差量渲染为何节流 16ms 但"
tags: [pi, tui]
---
源码：`packages/tui/src/tui.ts`（约 1456 行）  
被谁调用：所有组件和两种 Screen；coding-agent `createInteractiveTui` 得到的就是 `TUI`。

## 本课目标

把 `TuiBase.start` / `stop` / `requestRender` / `handleTerminalInput` 画成一张图。能指出 overlay 栈如何抢焦点、`CURSOR_MARKER` 干什么、差量渲染为何节流 16ms 但键盘走 immediate。`doRender` 本身是抽象的，下一课才写屏。

## 在系统中的位置

```text
new TuiMainScreen|TuiAltScreen(terminal)  extends TuiBase extends Container
tui.addChild(editor)
tui.setFocus(editor)
tui.start()
  terminal.start(handleTerminalInput, requestRender)
  requestRender → doRender          【子类】
tui.stop({ preserveScreen? })
```

本文件还导出鼠标类型、`dispatchMouseEvent`、`compositeTuiLine`、`TUI` 接口、`ViewportTUI`。

## `Component` / `Focusable` / `CURSOR_MARKER`

`render(width): string[]` 是唯一必须的。`handleMouse` 返回 `handled` / `capture` / `focus` / `render`。`dispatchMouseEvent` 把普通 result 补上 `target`（含 origin，方便 drag 时 `retargetMouseEvent`）。Container 若自己有 `handleInput`，子组件 focus 会把 `focusTarget` 抬到 Container——overlay 里嵌 Input 时键盘仍由 overlay 收。

`CURSOR_MARKER = "\x1b_pi:c\x07"`。终端忽略 APC。TUI 搜到后剥掉再定位硬件光标。

## `Container`

垂直堆叠：`render` 把每个 child 的行 concat，并记下 `mouseLayout`（各 child 高度）供 `handleMouse` 按 y 命中。width 变了才重新测高度。

`TuiBase` 继承它，所以 `tui.addChild` 就是往这份列表推。AltScreen 可以另设 `layoutRoot`，那时 `getMountedRoots` 不再是 `children`。

## `TUI` 接口要点

`mode`、`terminal`、`start/stop`、`requestRender/renderNow`、`setFocus`、`showOverlay`、`addInputListener`、颜色查询。`ViewportTUI` 额外 `setLayoutRoot`，用 `Symbol.for("@earendil-works/pi-tui/viewport")` 识别。

`TuiStopOptions.preserveScreen`：另一个 TUI 要接管同一终端时，不要清屏/打文档。InteractiveMode 在 Main↔Alt 切换时用。

## `start` / `stop`

```ts
start() {
  stopped = false
  beforeTerminalStart()          // Alt：进备用屏
  terminal.start(input, resize→requestRender)
  afterTerminalStart()
  hideCursor()
  若开了配色通知：CSI ?2031h
  queryCellSize()                // 仅当 capabilities.images：CSI 16 t
  requestRender()
}

stop(options) {
  stopped = true
  cancelRenderTimer()
  关 2031
  beforeTerminalStop(options)    // Main：光标移到末尾；Alt：关鼠标、删 Kitty 图
  showCursor()
  terminal.stop()
  afterTerminalStop(options)     // Alt：退备用屏、打印文档
}
```

resize 不在本文件解释，只 `requestRender`。真正重排在 Screen 的 doRender。

## 渲染调度

- `requestRender()`：置位，`nextTick → scheduleRender`。距上次 <16ms 则 `setTimeout` 补齐。这是流式 token 的合并。
- `requestRender(true)` / 键盘路径 `requestImmediateRender`：清差量状态（force 时 `resetRenderState`），`nextTick` 立刻 `doRender`，并取消已排队的节流 timer。注释：Windows 上 `setTimeout(0)` 也可能整 16ms 一拍。
- `stopped` 后 timer 回调直接 return。

`fullRedraws` 计数给测试和 debug。`setClearOnShrink`：内容变矮时是否全清（默认 false，慢终端少闪）。

## `handleTerminalInput`

顺序：

1. 吃掉 OSC 11 背景色回复、CSI `?997;n` 配色报告
2. `inputListeners`：可 `{ consume: true }` 或改 `data`。AltScreen 在这里拦视口按键；coding-agent 拦 Ctrl+C
3. 吃 CSI `6;h;w t` 单元格像素，更新 `setCellDimensions`，invalidate+render
4. `shift+ctrl+d` → `onDebug`
5. 焦点在不可见 overlay 上则改焦点
6. overlay focus restore（见下）
7. `focused.handleInput`，过滤 key release（除非 `wantsKeyRelease`），然后 immediate render

## Overlay

`showOverlay(component, options)` 推进栈。默认抢焦点，除非 `nonCapturing` 或 `visible()` 当前为假。options：宽高百分比、anchor、margin、`visible(termW,termH)`。

`OverlayHandle`：hide / setHidden / focus / unfocus / getBounds。

焦点恢复：从 overlay 把焦点暂时交给底下某个组件时，记下 `blocked`；那个组件没挂了或 unfocus 再把焦点还回去。这是「命令面板开着又点了 transcript」这类交互的状态机，单步时对着 `setFocusInternal` 看。

`compositeTuiLine`：按列把 overlay 行贴进底行。底行是 image line 则不贴（保护 Kitty 图）。贴合处插入 `SEGMENT_RESET`（SGR 0 + 关 OSC 8），防止样式泄漏。超宽则 `sliceByColumn`。

`dispatchMouseToOverlay`：从 `renderedOverlayLayouts` 顶向下命中。

## 失败与边界

- start 之后才能 query 颜色；超时的 Promise resolve `undefined`。
- overlay `visible` 随 resize 变假时，输入循环会把焦点挪走。
- `children` 是公开数组。外面 splice 不会清 overlay，也绕过 addChild 的逻辑——不要这么做。
- 本文件不写终端字节，除了颜色/单元格查询序列。写屏在 Screen。

## 下一课

[03-terminal.ts.md](/series/pi-source/tui/425-terminal-ts/)：raw 模式和 Kitty 协商。
