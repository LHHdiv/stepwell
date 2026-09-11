---
title: "09 · components/text.ts — 多行文本"
summary: "看清缓存键是 (text, width)，paddingX 在窄屏会收缩，空文本 render 成 [] 而不是一行空行（但走完 wrapping 后空结果会变成 [\"\"]）。"
tags: [pi, tui]
---
源码：`packages/tui/src/components/text.ts`  
被谁调用：Loader 继承它；transcript 消息、静态标签。

## 本课目标

看清缓存键是 `(text, width)`，paddingX 在窄屏会收缩，空文本 render 成 `[]` 而不是一行空行（但走完 wrapping 后空结果会变成 `[""]`）。

## 在系统中的位置

叶子组件。MainScreen 下直接 addChild。没有 layout node。

## `Text`

构造：`text, paddingX=1, paddingY=1, customBgFn?`。`setText` / `setCustomBgFn` / `invalidate` 清缓存。

`render`：

1. 缓存命中则返回同一数组引用
2. `trim()===""` → 缓存空数组返回（**不占行**）
3. tab → 三空格
4. `paddingX = min(原值, floor((width-1)/2))`，保证 contentWidth≥1
5. `wrapTextWithAnsi`，左右 pad，可选 `applyBackgroundToLine`
6. 上下 `paddingY` 空行（同样铺背景）
7. 若结果空则 `[""]`

## 失败与边界

- 返回的数组被外面改会污染缓存。当只读。
- 不含 handleInput。不可聚焦。
- 默认 padding 1：和终端边缘留一列。窄宽度下自动减。

## 下一课

[10-components.truncated-text.ts.md](/series/pi-source/tui/432-components-truncated-text-ts/)：单行截断。
