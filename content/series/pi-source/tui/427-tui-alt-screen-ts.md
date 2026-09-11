---
title: "05 · tui-alt-screen.ts — 备用屏视口"
summary: "分清「文档」和「视口」：组件 render 出完整文档，ScrollView + layout 决定看见哪一段。能指出 start 时进 1049h、stop 时把文档打回主屏、鼠标 SGR 如何变成 scroll/select/cli"
tags: [pi, tui]
---
源码：`packages/tui/src/tui-alt-screen.ts`（约 1721 行）  
被谁调用：`tuiMode: "fullscreen"` 的 InteractiveMode；实验 mini tui。

## 本课目标

分清「文档」和「视口」：组件 render 出完整文档，ScrollView + layout 决定看见哪一段。能指出 start 时进 1049h、stop 时把文档打回主屏、鼠标 SGR 如何变成 scroll/select/click。搜索和 flash 是叠在视口上的，不是组件树里的普通 child。

## 在系统中的位置

```text
new TuiAltScreen(terminal, cursor, logDir, options)
  隐式 document = super.render 的 children
  隐式 ScrollView(follow: "end", primary)
  addInputListener(handleViewportInput)
start → ENTER_ALT_SCREEN + 鼠标 + 关自动换行
doRender → renderLayoutFrame 或隐式 scroll
stop → EXIT_ALT_SCREEN；非 preserve 则打印 lastDocument
```

实现 `ViewportTUI`：`setLayoutRoot` 换成应用自己的 vstack/scroll 树。未设置时 children 仍垂直文档 + 隐式 scroll。

## 生命周期钩子

`beforeTerminalStart`：清选区/拖动/flash；若能力是 iTerm2 图，**关掉图像协议**（备用屏里 iTerm 图不可靠），invalidate。tmux/zellij/screen 只用 button-motion 鼠标（1002），否则 all-motion（1003）——多路复用器转发每个 move 会卡。

`beforeTerminalStop`：关搜索、删全部 Kitty 图、关鼠标、开回 wrap。

`afterTerminalStop`：preserve 则只退备用屏；否则 render 完整文档、剥 OSC 133 和 cursor marker、退出备用屏后逐行 `2K` 打出来，最后换行给提示符。恢复被关掉的 capabilities。

## 视口输入 `handleViewportInput`

在 TuiBase listeners 里，可 consume：

- page/half/line up/down、top/bottom、上一/下一 prompt（OSC 133 区）
- `/` 开搜索，n/N 跳匹配，Esc 关
- 有选区时复制相关

焦点在 Editor 里打字时，多数视口键不应抢走——实现里用 keybindings 名称判断，具体哪些在有焦点组件时放行，对着 `handleViewportInput` 和 `tui.altScreen.*` 绑定看。

## 鼠标

解析 SGR `CSI < b ; x ; y M/m`。滚轮乘 `wheelScrollLines`（再乘 5 的 trackpad 因子）。命中顺序：overlay → scrollbar thumb → 组件 handleMouse → 选区拖动 → 主 ScrollView 滚动。

`overscroll: "chain"` 的嵌套 ScrollView：内层 `scrollBy` 吃不完的 delta 传给外层。`contain` 则吃掉。

单击 OSC 8 链接触发 `openUrl`。Windows 右键 `onRightClickPaste`。`copyOnSelect` 默认 true，release 时经 `copySelection` 或 OSC 52。

双击/三击改 granularity：character / word / line。选区拖出视口启动 auto-scroll timer。

## Kitty 缓存

`prepareKittyScreen`：视口外的图可缓存传输（上限 16 张 / 32MiB 传输 / 64MiB 解码），滚回来少传。超出则 eviction + delete。`C=1` 放置不挪光标。

## `doRender` 骨架

1. 若有 layoutRoot：`renderLayoutFrame(root, width, height)`
2. 否则用隐式 scroll 的文档行切 viewport
3. 叠选区反转、搜索高亮、flash、scroll-to-end 指示
4. 和 `previousScreen` 逐行比，CSI 2026 包起来写
5. 放硬件光标（Editor 的 marker 映射到视口坐标）

宽或高变：重置 previousScreen，全写。

## 失败与边界

- iTerm 图在备用屏被关：Image 组件走 fallback 文本。
- 鼠标在无 1006 的终端会解析失败，视口仍可用键盘。
- `lastDocument` 供 stop 打印；若 stop 时组件已经空了，主屏上只剩空文档。
- 本文件巨大。单步建议：`beforeTerminalStart`、`doRender`、`handleViewportInput`、鼠标 dispatch。选区几何是纯函数，可用测试文件对照。

## 下一课

[06-layout-node.ts.md](/series/pi-source/tui/428-layout-node-ts/)：组件如何声明自己是 stack/scroll。
