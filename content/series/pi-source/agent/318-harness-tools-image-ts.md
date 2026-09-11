---
title: "77 · tools/image.ts — 魔数嗅探与自写 base64"
summary: "标准字母表，按 3 字节一块，补 =。不调用 Buffer.toString(\"base64\")。"
tags: [pi, agent]
---
源码：`packages/agent/src/harness/tools/image.ts`  
被谁调用：read.ts。不依赖 Node Buffer（encode 自己实现），方便非 Node env 测试。

## `detectSupportedImageMimeType`

| 魔数 | 结果 |
|---|---|
| JPEG SOI，且第 4 字节不是 0xF7 | image/jpeg（排除 JPEG XL 一类） |
| PNG 签名 + IHDR 长 13，无 acTL 在 IDAT 前 | image/png；动画 PNG 返回 undefined |
| GIF | image/gif |
| RIFF…WEBP | image/webp |
| BM + DIB 合理、1 plane、合法 bpp | image/bmp |
| 其它 | undefined（当文本读） |

## `encodeBase64`

标准字母表，按 3 字节一块，补 `=`。不调用 `Buffer.toString("base64")`。

## 失败与边界

嗅探只看头，不保证文件完整。损坏 PNG 可能仍返回 image/png，厂家再拒。

## 下一课

[78 · env/nodejs.ts](/series/pi-source/agent/319-harness-env-nodejs-ts/)。
