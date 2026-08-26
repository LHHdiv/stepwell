---
title: 第29讲·差分渲染：廉价终端上的流畅
summary: pi-tui 不整屏重绘，而是记住上一帧、只改写变化的行。本讲看这套"差分渲染"如何用最少的终端写操作刷出流式对话。
objectives:
  - 说出差分渲染的核心思想：记住上一帧、只写变化的行
  - 指出 TUI 用 renderRequested + setTimeout 做的"渲染调度合并"
  - 把差分渲染和第 06 讲的流式事件连起来：为什么流式天然适合增量画
tags: [pi, tui, 差分渲染, 性能]
keyPoints:
  - "pi-tui 是手写差分渲染（tui.ts:2 注释明言），不依赖 blessed/ink 等重框架"
  - "TUI 主类（tui.ts:248）持有上一帧，render 时只把'变化的行'写回终端，避免整屏重绘"
  - "渲染用 renderRequested 标志 + setTimeout 合并（tui.ts:339/:341/:812），多次事件只触发一次 flush"
  - "tui.ts:899 注释点出：连 setTimeout(0) 在 Windows 上也至少占一帧(16ms)，所以调度必须克制"
  - "流式事件（第 06 讲）天然适配差分：每来一段 delta，只改'当前回复行'，其余不动"
---

第 02 讲我们看到 TUI 订阅了 agent 的流式事件，把模型的"边想边吐字"实时画出来。但你有没有想过：终端是很笨的设备——它不会"局部更新一个 div"，只能一行一行（甚至一个字符一个字符）地写。如果每来一个字就整屏重绘，未免太慢太闪。这一讲看 pi 的解法：**差分渲染**。

## 一、先结论：只改变化的那几行

`packages/tui/src/tui.ts:2` 的开篇注释就定调：

> Minimal TUI implementation with differential rendering

"差分渲染"（differential rendering）的意思是：TUI 记住**上一帧长什么样**，新一帧算出来后，逐行比较，**只把变化的行写回终端**。一屏 80×24 的字符，模型吐一个字，可能只有"当前回复行"最后几个字符变了——那 pi 就只动那几个字符，而不是清屏重画。

主类在 `tui.ts:248`：

```ts
// TUI - Main class for managing terminal UI with differential rendering
export class TUI { ... }
```

它内部维护一个"上一帧的渲染结果"，每次 `render` 时拿新结果和旧结果做行级 diff，生成最小的写操作序列。

## 二、渲染调度：别让事件淹没终端

流式对话里，事件来得很密——模型可能每几毫秒吐一个 token。如果"每来一个事件就重绘一次"，终端会被刷爆。pi 用一个经典的**合并调度**化解：

```ts
private renderRequested = false;     // tui.ts:339 是否有待渲染
private renderTimer?: NodeJS.Timeout; // tui.ts:341 节流定时器

// 某处请求渲染时：
this.renderRequested = true;
if (this.renderTimer === undefined) {
	this.renderTimer = setTimeout(() => {   // tui.ts:812
		this.renderRequested = false;
		this.flush();   // 真正比较上一帧、写终端
	}, 0);
}
```

逻辑是：**事件只置 `renderRequested = true` 并启动一个 `setTimeout(0)`；同一个 tick 内的所有事件共享这一次 flush**。于是"一帧内 100 个 token"被合并成"一次渲染"，既流畅又不卡。

`tui.ts:899` 的注释还点出一个工程细节：

> even setTimeout(0) can take a full 16 ms tick on Windows.

意思是连"尽快"的 `setTimeout(0)`，在 Windows 上也至少等一帧（约 16ms）。所以渲染调度必须**克制**——不能指望微秒级响应，而要靠合并把开销压到每帧一次。

## 三、为什么流式天然适配差分

回到第 06 讲：`AssistantMessageEvent` 是**增量**的——每来一段 `text` delta，TUI 只知道"回复又长了几个字"。这正是差分渲染最爱的输入形态：

- 第 1 个事件：画"模型："+"你" → 只写这一行。
- 第 2 个事件：delta="好" → 上一行变成"模型："+"你好" → 只追加"好"一个字。
- ……全程不碰"上面的工具调用区""下面的输入框"。

对比"整屏重绘"：每来一个字，要把整屏（包括没变的工具列表、滚动历史）重新打印一遍，既慢又闪，用户还会看到光标乱跳。差分渲染让"流式"在廉价终端上也能丝滑。

## 四、叠层与差分

渲染不是单纯一行字符串，还有输入框、状态栏、工具调用的"叠层"（overlay）。看 `tui-main-screen.ts:199`：

> Composite overlays into the rendered lines (before differential compare)

即：先把各组件（消息区、输入框、overlay）**合成**成一整屏的"渲染行"，再做差分比较。顺序是"先合成、再 diff、最后只写变化行"——差分永远作用在"合成后的最终画面"上，保证局部更新不会破坏整体布局。

## 五、试一试

1. 在 `tui.ts` 里搜 `flush` 或 `prevLines`/`lastLines`，看它具体怎么保存"上一帧"并比较（Hint：可能用数组存上一帧每行文本）。
2. 把 `tui.ts:812` 的 `setTimeout(..., 0)` 改成 `setTimeout(..., 100)`，推断用户体验会变成什么样（提示：事件合并窗口变长，更省但更"顿"）。
3. 思考：差分渲染要求"能精确比较两帧"。如果某个组件渲染结果带"随机 ID"（如 `terminal-image.ts:168` 提到的随机 ID），差分会误判吗？怎么规避？

## 下一讲预告

差分渲染解决了"怎么高效画"，但画面由什么组成？下一讲看 `pi-tui` 的组件与布局：消息区、输入框、状态栏如何被拆成 `Component`，再用 `layout` 拼成整屏。
