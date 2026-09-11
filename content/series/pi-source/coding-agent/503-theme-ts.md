---
title: "24 · theme.ts — 全局主题对象"
summary: "构造时把每个颜色 token 预渲染成 ANSI 前缀存进 Map。fg(color, text) 输出 ansi + text + \\x1b[39m（只重置前景，不碰背景）。bg 重置 \\x1b[49m。bold/italic 走 c"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/theme/theme.ts`（约 1234 行）  
被谁调用：几乎所有 interactive 组件；`initTheme` 由 `InteractiveThemeController` 在构造时调用。

## 本课目标

1. `theme` 为什么是 Proxy 而不是普通对象。  
2. hex 如何变成 truecolor / 256 色 ANSI。  
3. 内置 dark/light、用户 JSON、扩展注册主题如何叠在一起。

## 在系统中的位置

```text
InteractiveMode 构造
  setRegisteredThemes(resourceLoader.getThemes())
  new InteractiveThemeController → initTheme(name)
    loadTheme → new Theme(fg, bg, mode)
    setGlobalTheme 写到 globalThis[Symbol]
组件 render
  theme.fg("accent", text)  → Proxy get → 当前 Theme.fg
```

## `Theme` 类

构造时把每个颜色 token 预渲染成 ANSI 前缀存进 Map。`fg(color, text)` 输出 `ansi + text + \x1b[39m`（只重置前景，不碰背景）。`bg` 重置 `\x1b[49m`。bold/italic 走 chalk。

`getThinkingBorderColor(level)` 把 thinking 档位映射到 `thinkingOff`…`thinkingMax`。编辑器边框颜色跟当前 thinking 走，就是这个函数。bash 模式边框用 `bashMode`。

## 色空间

`hexToRgb` → 若终端 `trueColor` 则 `\x1b[38;2;r;g;bm`，否则 `rgbTo256` 找 6×6×6 立方或灰度阶。灰度只在「几乎无饱和（spread<10）且灰度更近」时选用，避免把浅色 tint 收成灰。

JSON 里颜色可以是：`#rrggbb`、0–255 的 256 色索引、空字符串（重置）、或 `vars` 里的名字。`resolveVarRefs` 防环。

缺省 token：`scrollbarTrack`←`muted`，`thinkingMax`←`thinkingXhigh`，`searchMatchBg`←`selectedBg`。

## 加载顺序 `getAvailableThemesWithPaths`

1. 内置 `dark.json` / `light.json`（包内 `getThemesDir()`）  
2. `~/.pi/agent/themes/*.json`  
3. `setRegisteredThemes` 进来的扩展主题（带 `sourcePath`）

重名先到先得。`loadThemeJson` 优先内置，再注册表，再自定义文件。

校验：若安装了 `setThemeJsonValidator`（interactive-mode 会装 `validateThemeJson`），用户 JSON 走 typebox；否则只检查「有 colors 对象」。内置主题不走 typebox，避免为内置皮肤拉 17MB 模块图。

## 全局 `theme` Proxy

```ts
const THEME_KEY = Symbol.for("@earendil-works/pi-coding-agent:theme");
export const theme: Theme = new Proxy({} as Theme, {
  get(_target, prop) {
    const t = globalThis[THEME_KEY];
    if (!t) throw new Error("Theme not initialized. Call initTheme() first.");
    return t[prop];
  },
});
```

扩展用 jiti 加载会有**另一份** `theme.ts` 模块实例。普通 `export let theme` 对不上。`Symbol.for` 挂在 `globalThis` 上，所有副本读同一份。旧包名 `@mariozechner/pi-coding-agent:theme` 也写一份，兼容老扩展。

没 `initTheme` 就用 `theme.fg` 会直接 throw。print/RPC 也会 import theme 模块（rpc-mode 的 uiContext.get theme），但 RPC 不画 TUI，只要对象存在。

## 热更新

`enableWatcher` 时对当前自定义 JSON `fs.watch`。变了 debounce 后 `loadTheme` + `onThemeChangeCallback`。InteractiveMode 在 callback 里 `ui.invalidate()`。内置主题不监视。`setThemeInstance`（扩展塞进来的内存 Theme）停 watcher。

## 终端亮暗

`detectTerminalBackgroundFromEnv` 读 `COLORFGBG` 等。`detectTerminalBackgroundTheme` 向 tty 发 OSC 查询，等 100ms。`parseAutoThemeSetting("dark/light")`：名字带 `/` 表示 auto，左边暗主题、右边亮主题。`/` 因此被禁止出现在主题 `name` 里。

## 语法高亮 / Markdown 主题

`highlightCode` 用 `utils/syntax-highlight.ts` + 本主题的 `syntax*` token。`getMarkdownTheme` / `getEditorTheme` / `getSelectListTheme` / `getSettingsListTheme` 把 token 填进 tui 包的 theme 接口。组件不要自己写 chalk.cyan，否则换肤无效。

## 失败与边界

- 加载失败 `initTheme` 静默回 dark；`setTheme` 返回 `{ success:false, error }` 并同样回 dark。
- `DynamicBorder` 注释：jiti 下若有人在模块顶层捕获了 `theme` 函数引用，可能拿到未初始化的 Proxy。扩展应把 `color` 函数当参数传入。

## 下一课

[25-theme-json.ts.md](/series/pi-source/coding-agent/505-theme-json-ts/) — 用户主题的 schema。
