---
title: 第30讲·组件与布局：把屏幕拆成 Component
summary: pi-tui 把终端画面拆成可组合的 Component（render(width) 返回字符串行），再用 layout 分配区域拼成整屏。本讲看这套声明式 UI 骨架。
objectives:
  - "说出 Component 接口的核心方法 render(width): string[] 意味着什么"
  - 解释 layout 如何把多个组件分配成屏幕上的不同区域
  - 把组件/布局和第 29 讲"合成后再差分"连起来
tags: [pi, tui, 组件, 布局]
keyPoints:
  - "Component 的核心契约是 render(width): string[]（tui.ts:29/:235）——给定宽度，返回该行组件要画的字符串行"
  - "layout.ts 的 renderLayoutFrame（:353）与 renderCached（:62）负责把组件树分配成屏幕区域并带缓存"
  - "组件是纯函数式的：同样状态进、同样字符串出，便于第 29 讲做差分比较"
  - "消息区/输入框/状态栏都是独立 Component，合成（tui-main-screen.ts:199）后才整体差分"
  - "markdown 组件（components/markdown.ts）让对话里的代码块/列表有专门的渲染，呼应第 21 讲 registerMarkdownComponent"
---

第 29 讲我们看 TUI 记住"上一帧"、只写变化的行。但"一帧"由什么组成？这一讲看 `pi-tui` 如何把终端画面拆成**组件（Component）**，再用布局（layout）拼起来——一套极简的声明式 UI。

## 一、先结论：Component = 给定宽度，返回字符串行

整个 UI 的原子是 `Component`。它的契约在 `packages/tui/src/tui.ts:29`：

```ts
interface Component {
	render(width: number): string[];   // 给定宽度，返回要画的字符串行
}
```

就这么简单：`render(width)` 吃一个"屏幕/区域宽度"，吐出一组**字符串行**。注意返回的是 `string[]` 而不是去改终端——组件只负责"描述自己长什么样"，至于"画到哪、怎么差分"，交给上层。

具体实现见 `tui.ts:235`：

```ts
render(width: number): string[] {
	const childLines = child.render(width);   // 子组件先画，父组件再包
	// ...把子组件的行包进边框/标题等
}
```

这是个典型的**组合模式**：父组件调子组件的 `render`，把子组件的输出再加工。一棵树状 UI，最终从根节点 `render` 一次，就得到整屏的字符串行。

## 二、layout：把组件摆到屏幕上

单个组件只知道"我画什么"，不知道"我占屏幕哪块"。这件事归 `layout` 管。看 `packages/tui/src/layout.ts`：

```ts
function renderCached(context, component, width): string[] { ... }   // :62 带缓存的渲染
export function renderLayoutFrame(...) { ... }                       // :353 把区域框出来
```

`renderLayoutFrame`（`:353`）负责把屏幕切分成若干**区域**（region），每个区域放一个组件——比如上半屏是消息滚动区，底部几行是输入框，最底下是状态栏。`renderCached`（`:62`）则给组件渲染加一层缓存：如果组件状态和上次一样，直接复用上次的字符串行，省去重算。

> **知识拓展**：这种"组件描述 UI + 布局分配区域"的思路，和 React 的 `render()` 返回虚拟 DOM、再由 reconciler 决定真实 DOM 更新，是同一思想的终端版。区别是 pi 的"虚拟 DOM"就是 `string[]`，"reconciler"就是第 29 讲的差分比较。

## 三、为什么纯函数式组件利于差分

注意 `render(width): string[]` 是**纯**的：同样的状态进去，同样的字符串出来，没有副作用、不碰终端。这恰好喂给第 29 讲的差分渲染——

- 状态变了 → `render` 输出变了 → 和上一帧比较，只写变化的行。
- 状态没变 → `render` 输出不变 → 配合 `renderCached` 甚至不重算，直接复用。

如果组件是"命令式"（自己直接 `process.stdout.write`），差分就无从比较了。纯函数式是差分渲染能成立的前提。

## 四、真实组件长什么样

`pi-tui` 自带一批组件：

- **消息区**：渲染对话历史，每条消息一个块。
- **输入框**：渲染用户正在敲的内容（含光标）。
- **状态栏**：显示模式、模型、token 用量等。
- **markdown 组件**（`components/markdown.ts`）：把对话里的 markdown 渲染成带样式的终端文本——代码块高亮、列表缩进、链接处理。它正好对应第 21 讲 `ExtensionAPI.registerMarkdownComponent`：扩展可以**替换或增强**这个渲染。

这些组件先各自 `render`，再在 `tui-main-screen.ts:199` 处"合成"（composite overlays）成整屏，最后整体差分。组件管"内容"，layout 管"位置"，差分管"效率"——三层各司其职。

## 五、试一试

1. 打开 `components/markdown.ts`，搜 `render(` 看 markdown 组件如何实现 `Component` 接口（它返回的 `string[]` 和普通文本有什么不同？）。
2. 在 `layout.ts:62` 的 `renderCached` 里看缓存的 key 是什么（状态？组件引用？宽度？），推断"宽度变了"会不会触发重渲染。
3. 思考：如果某个组件 `render` 依赖了"当前时间"（`Date.now()`），差分渲染会出什么怪象？这给了组件设计什么约束？

## 下一讲预告

画面有了、布局有了，还差"输入"——用户敲的键怎么变成命令？下一讲看 `pi-tui` 的键位捕获与分发：原始终端输入如何被解析成按键事件，又如何路由给快捷键处理器。
