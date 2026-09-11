---
title: "26 · editor-component.ts — 可替换编辑器接口"
summary: "coding-agent 交互模式依赖的是这份接口，不是 Editor 类。vim 扩展实现它即可。必填：getText/setText/handleInput/onSubmit/onChange。其余带 ?。"
tags: [pi, tui]
---
源码：`packages/tui/src/editor-component.ts`

## 本课目标

coding-agent 交互模式依赖的是这份接口，不是 `Editor` 类。vim 扩展实现它即可。必填：`getText`/`setText`/`handleInput`/`onSubmit`/`onChange`。其余带 `?`。

## 字段分组

- 核心文本
- 回调
- `addToHistory?`
- `insertTextAtCursor?` / `getExpandedText?`（无则 InteractiveMode 退回 getText，大粘贴不会展开）
- `setAutocompleteProvider?`
- `borderColor?` / `setPaddingX?` / `setAutocompleteMaxVisible?`

还要是 `Component`（render/invalidate）。Focusable 没写在接口上，但没有 `focused` 就没有硬件光标。

## 失败与边界

缺 optional 方法时产品功能静默变少，不会 throw。实现者应至少做 getExpandedText 若支持 paste marker。

## 下一课

输入字节如何变成键名：[27-keys.ts.md](/series/pi-source/tui/449-keys-ts/)。
