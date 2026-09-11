---
title: "19 · tui-plan.md — 约束布局的设计移交"
summary: "带走这张图，再去读 TuiAltScreen / interactive-mode.ts 才不会把两种屏幕模型混成一种："
tags: [pi, root]
---
源码：`tui-plan.md`  
被谁调用：实现 `packages/tui` 约束布局的人（和 agent）。**运行时不 import 它。** 读 TUI 源码时用它当「作者当时决定了什么」，不是当当前代码的逐行注释——实现可能已经部分落地或偏离。

## 本课目标

带走这张图，再去读 `TuiAltScreen` / `interactive-mode.ts` 才不会把两种屏幕模型混成一种：

```text
主屏 TuiMainScreen     终端拥有滚动，应用只是往下打印一份文档
备屏 TuiAltScreen      应用拥有整块视口，才能做 sticky dock + 内部 ScrollView
```

coding-agent 交互模式在两种屏幕上**共用同一批组件实例**，只是组装方式不同。这是全文最重要的产品约束。

## 在仓库中的位置

```text
tui-plan.md                 设计（本课）
packages/tui/src/           实现应落地的地方
packages/coding-agent/src/modes/interactive/interactive-mode.ts
                            组装 VStack/ScrollView，逻辑保持声明式
```

文档自称 implementation handoff：讨论中已拍板的范围，除非实现发现必须回炉，否则按本文做。它不是 RFC 网站上的长期规划全文，是一份可执行的范围盒。

## 文件做什么（按决策，不按目录）

### 为什么主屏不能装这套布局

终端 scrollback 一旦把行推出视口，应用就不能再可靠地：sticky 行、嵌套独立滚动、并排满高 pane、对已滚走内容做 hit test、任意重绘而不清屏。因此 **不要假装 `TuiMainScreen` 也有约束视口**。主屏保持：

```text
header → resources → chat → pending → status → widgets → editor → footer
```

备屏变成：上半 `ScrollView` 里是 transcript（header/resources/chat），下半固定 dock（pending/status/widgets/editor/footer）。pending 和 working 状态必须留在固定区——滚走「正在跑工具」会让人以为死了。

### 公开 API 故意很小

第一期只新增：`VStack`、`HStack`、`ScrollView`，外加已有 overlays。调用方拼组件树，**不准**碰 layout box、矩形、hit-test 节点。每帧重建内部 layout 树，但**不**重建组件 state。

`StackEntryOptions` 是轴中性的：`basis` / `grow` / `shrink` / `minSize` / `maxSize` / `visible(viewport)`。实现必须用显式字段，禁止 TS 参数属性——根 `erasableSyntaxOnly` 的硬约束写进了设计文档。

`ScrollView.scrollBy()` 返回未消耗的 delta，供嵌套滚动 chaining。`follow: "end"` 复用今天 `stickToBottom` 的语义：在底部时内容增长跟着走，离开底部则关闭 follow。

能力探测用 `ViewportTUI` / `isViewportTUI`，不要 `instanceof` 具体类。`TuiMainScreen` 不实现该接口。没有显式 `setLayoutRoot` 时，备屏把现有 `addChild` 文档包进隐式 primary ScrollView，保住旧 API 和旧测试。

### 内部 layout 树 vs 组件树

组件树长寿命、有状态（VStack → ScrollView → chat；旁边 dock）。layout 树是一帧快照：box 带 `rect`/`clip`/`lines`/`scrollView`/`layer`。渲染成功后原子替换 `currentLayout`，输入路由永远对着**上一帧已经画出来的几何**，而不是正在构建的下一帧。

缓存策略：重建几何，复用叶子 `render(width)` 的行数组引用。Markdown/Text/Image/Box 已有自己的 cache。不要在 layout 引擎再做第二套 WeakMap，失效语义会和组件自己的 invalidate 打架。

### 分配算法（实现时最容易抖的地方）

共享一个按轴参数化的 stack allocator：

1. `visible` 先滤掉，再算 gap
2. `basis: "auto"` 用主轴本征尺寸；HStack 必须先分配宽度再量高度（折行叶子）
3. 剩余空间按 `grow` 比例分，**确定性整数舍入**，余数按 child 顺序，避免帧间抖动
4. 溢出按 `shrink` 收到 `minSize`；仍不够就 clip
5. 若叶子含 `CURSOR_MARKER`，垂直 clip 时尽量让光标行仍可见——否则 IME/编辑器光标会在小终端里消失

交互模式的第一份尺寸：transcript `basis:0 grow:1 shrink:1 minSize:1`，dock `basis:auto grow:0 shrink:1 minSize:1`。极小终端的优先级：至少一行 transcript → 保住焦点编辑器 → 尽量一行 footer → 先裁 widgets/pending。这是 coding-agent 的 stack 参数，不是通用 TUI 的领域规则。

### 绘制、输入、光标、选区、图、overlay

- 画：每行 ANSI 字符串，不用 cell 对象模型。必须 ANSI-aware 切片（`sliceByColumn` / `compositeTuiLine` / `visibleWidth`），禁止 `substring` 按 JS 下标切列。
- 鼠标：在 `TuiAltScreen` 解析后变成规范化 `TuiMouseEvent`，对着 **committed** layout hit test。滚轮从最深 box 向根走，按 `overscroll: chain|contain` 传递；没命中则交给 primary ScrollView。dock 上滚轮应滚 transcript，且**不抢编辑器键盘焦点**。
- 不检测「终端支不支持鼠标」——不可靠。键盘 `pageUp/pageDown/top/bottom` 永远可用，走可配置 keybindings，禁止硬编码按键（AGENTS.md 同一条）。
- 选区第一期只保证**可见屏幕**坐标；固定 dock 行不得映射到 transcript 的错误行。Hyperlink 点的是合成后的那一行 OSC 8。
- Kitty 图：垂直 transcript 必须保持裁剪/重绘；HStack 里的图不要求通用，不能把邻列画坏。
- Overlay 先画在约束布局之上，第一期不把 overlay 变成嵌套 layout 根。
- 退出备屏时用**无界高度**渲染完整逻辑文档（ScrollView 输出全部 child），不要把最后一帧视口当终稿。

### interactive-mode 应保持小

只加 `documentContainer` / `footerContainer` 两个稳定分组，现有 header/chat/editor 容器不拆。主屏仍 `addChild` 那一串；备屏 `setLayoutRoot(VStack(ScrollView, dock))`。`setExtensionFooter` 只清 `footerContainer`，不再对 TUI 根 remove/add——否则会和 layout root 打架。

消息流、工具更新、widget API、焦点、主题不应因换组装而改逻辑。它们继续往稳定容器里塞子组件，布局自动对。

## 关键逻辑

这份文件存在，是因为备屏 sticky dock **没法**在主屏模型上「加一个 CSS」。若不先读决策 1–10，实现者会把 flexbox 做进 `TuiMainScreen`，或在 coding-agent 里手算行号。失败模式就是：主屏 scrollback 错乱、备屏光标跑到 dock 外、滚轮把焦点从 editor 偷走、退出 alt 时只打印了最后一屏。

它与启动链的关系：交互模式选 `--alt`（或默认备屏，以当时代码为准）才会走到这些 API。`print` / RPC 模式不创建 TUI，本文件对它们为零。课表在 InteractiveMode 之前不必实现它；把它放在根目录课，是因为它是根上唯一的大型设计文档，且不进 `packages/tui` 的源码树。

当前实现是否已完全按本文落地，以 `packages/tui/src` 为准。读 TUI 课时应带着本文的「非目标」清单：不做 CSS flex、不做 grid、不做 transcript 虚拟化、不把内部 box 公开。

## 和启动链的关系

不在 `pi-test.sh` 链的前几跳。链走到 `InteractiveMode` 且 renderer 是 `TuiAltScreen` 时，本文变成实现对照表。

## 下一课

根目录文件读完。从公共函数开始进 `scripts/`：[20-package-workspaces.mjs.md](/series/pi-source/root/024-package-workspaces-mjs/)。
