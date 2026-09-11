---
title: "117 · utils/tool-result-images.ts — 工具结果里的图也要规范化"
summary: "扩展/MCP/截图工具可能丢一张超大 base64。不处理的话后续整段对话都被 provider 拒。normalizeToolResultImages 对每个 image 块 processImage。失败保留原块（和 read 工具"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/tool-result-images.ts`

扩展/MCP/截图工具可能丢一张超大 base64。不处理的话**后续整段对话**都被 provider 拒。`normalizeToolResultImages` 对每个 image 块 `processImage`。失败**保留原块**（和 read 工具不同：工具已经产出这张图，删掉更糟）。无图或完全没变则返回原数组，调用方可跳过写回。

## 下一课

[118-utils.tools-manager.ts.md](/series/pi-source/coding-agent/679-utils-tools-manager-ts/)
