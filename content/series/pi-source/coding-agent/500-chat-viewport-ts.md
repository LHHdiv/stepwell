---
title: "23 · chat-viewport.ts — 对话区 + 底部输入坞"
summary: "看 VStack 如何把「可以滚的 transcript」和「钉在底部的 editor」分成两块。regular 模式不用这个 viewport（组件按顺序 addChild 到 MainScreen）；fullscreen 用 set"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/chat-viewport.ts`（46 行）  
被谁调用：`InteractiveMode.init` 组 fullscreen 布局；实验 `client-tui.ts` 复用同一函数。

## 本课目标

看 `VStack` 如何把「可以滚的 transcript」和「钉在底部的 editor」分成两块。regular 模式不用这个 viewport（组件按顺序 addChild 到 MainScreen）；fullscreen 用 `setLayoutRoot(viewport.root)`。

## 布局

```text
VStack root
  transcript  ScrollView(document)   grow=1  ← header + 资源列表 + 聊天
  dock        VStack                 auto
                pendingMessages               ← steer/follow-up 队列
                status                        ← Working / Retry / Compaction
                widgetsAbove                  ← 扩展 setWidget(placement: aboveEditor)
                editor           minSize=3
                widgetsBelow
                footer
```

`ScrollView`：`follow: "end"`（默认钉在底部，用户上滚才脱离）、`primary: true`（滚轮优先给它）、`overscroll: "chain"`（顶/底再滚就交给外层）。滚动条样式用 theme 的 `scrollbarTrack` / `scrollbarThumb`。

dock 里除 editor 外全部 `shrink: 1, minSize: 0`：终端变矮时先挤掉 pending/status/footer，尽量保住三行编辑器。

## 谁订阅事件

本文件**不订** Agent 事件。它只是把 InteractiveMode 已经建好的 Container 拼起来。Container 的孩子由 `handleEvent` 增删。

## 失败与边界

- `widgetsAbove/Below` 可选。没扩展 widget 时不要传 `undefined` 进 VStack——用条件展开空数组。
- 把 `document` 同时 addChild 到 MainScreen **和** ScrollView 会搞乱父子关系。`init` 里两种模式都 `mountInteractiveTui` 同一批组件；fullscreen 另外 `setLayoutRoot`。ViewportTUI 从 layout root 渲染，MainScreen 的 children 列表仍用于切模式时搬组件。

## 下一课

[24-theme.ts.md](/series/pi-source/coding-agent/503-theme-ts/) — 颜色从 JSON 到 ANSI。
