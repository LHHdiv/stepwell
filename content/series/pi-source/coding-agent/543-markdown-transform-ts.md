---
title: "44 · markdown-transform.ts — 扩展改 Markdown 的管道"
summary: "无。createMarkdownTransform(messageType, isStreaming, transformers) 返回闭包。每次 Markdown 渲染调用闭包，按注册顺序跑 MarkdownTransformer。某"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/markdown-transform.ts`  
谁调用：User/Assistant 气泡的 Markdown `transform` 选项。

## 订阅什么

无。`createMarkdownTransform(messageType, isStreaming, transformers)` 返回闭包。每次 Markdown 渲染调用闭包，按注册顺序跑 `MarkdownTransformer`。某个 throw 则跳过，保留当前字符串。

## 画什么

不画。内置 mermaid 转换器是管道里的一员，见下一课。

## 失败与边界

`transformer` 返回非 string 会被忽略。streaming 时 mermaid 可能选择不转换，避免半截图语法闪烁。

## 下一课

[45-mermaid.ts.md](/series/pi-source/coding-agent/545-mermaid-ts/)
