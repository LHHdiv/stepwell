---
title: "72 · tools/read.ts — 文本截断头、图片当附件"
summary: "resolveReadToolPath → readBinaryFile。魔数是支持的图片 → 走图；否则当 UTF-8 文本。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/read.ts`  
对位 coding-agent `core/tools/read.ts`，合同改为 ExecutionEnv。

## execute

`resolveReadToolPath` → `readBinaryFile`。魔数是支持的图片 → 走图；否则当 UTF-8 文本。

## 图

`imageProcessor` 可选：resize/转码，失败则纯文本说明。无 processor 时 BMP 明确省略（模型常不吃 BMP）；jpeg/png/gif/webp base64 进 `ImageContent`。动画 PNG 在 detect 阶段已拒绝（当文本读，通常是乱码——魔数函数返回 undefined）。

## 文本

offset 1-index。超出末尾 throw。`truncateHead`：先到 2000 行或 50KB。首行就超字节限制：提示用 sed|head -c，不返回半行。截断时告诉下一 offset。用户自己的 limit 未到文件尾也提示 remaining。

details.truncation 给 UI，模型主要看 content 里的文字提示。

## 失败与边界

二进制非图文件会当文本 decode，可能含替换字符。这是工具选择，不是 FileError。abort 靠 env.read 返回 aborted。

## 下一课

[73 · write.ts](/series/pi-source/agent/314-harness-tools-write-ts/)。
