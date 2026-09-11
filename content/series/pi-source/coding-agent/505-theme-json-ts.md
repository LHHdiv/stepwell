---
title: "25 · theme-json.ts — 用户主题 JSON 校验"
summary: "明白为什么校验不写进 theme.ts：typebox + compile 大约 17MB 模块图。只用内置主题的嵌入方（实验 mini、某些测试）不该为校验付钱。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/theme/theme-json.ts`  
被谁调用：`interactive-mode` 启动时 `setThemeJsonValidator(validateThemeJson)`。只校验**用户/扩展写的 JSON**，内置 dark/light 不走这里。

## 本课目标

明白为什么校验不写进 `theme.ts`：`typebox` + compile 大约 17MB 模块图。只用内置主题的嵌入方（实验 mini、某些测试）不该为校验付钱。

## schema 要点

`colors` 里每个值是：字符串（hex / var 名 / `""`）或 0–255 整数。必填 token 覆盖：核心 UI、用户/自定义消息底、工具三态底、Markdown、diff、syntax、thinking 档位、bashMode。可选：`scrollbar*`、`searchMatch*`、`thinkingMax`。

可选 `vars`：名字 → 颜色，供 colors 引用。可选 `export`：HTML 导出用的 `pageBg`/`cardBg`/`infoBg`，TUI 不用。

`name` 不得包含 `/`（留给 `dark/light` 这种 auto 设置）。

## `validateThemeJson`

`Compile(ThemeJsonSchema).Check`。失败时把 `required` 缺的 color 名字单独列成「Missing required color tokens」，其它路径错误另列。信息故意写给人看，指向内置 JSON 当范本。

## 失败与边界

- 本文件**不**解析 vars 环或 hex 合法性。那是 `theme.ts` `resolveVarRefs` / `hexToRgb` 的事。schema 只保证形状。
- 没安装 validator 时 `parseThemeJson` 只检查对象上有 `colors`。恶意/残缺 JSON 会在 `new Theme` 时缺 key throw，再被 `setTheme` 打回 dark。

## 下一课

[26-theme-controller.ts.md](/series/pi-source/coding-agent/507-theme-controller-ts/) — 设置项、auto 跟随终端、预览。
