---
title: "75 · utils/sanitize-unicode.ts — 去掉不成对的 surrogate"
summary: "不成对的 U+D800–DFFF 会让部分厂家 JSON 序列化抛错。合法 emoji（成对 surrogate）不受影响。正则：高 surrogate 后面不是低，或低前面不是高。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/sanitize-unicode.ts`  
被谁调用：几乎所有 `convertMessages` 在把文本塞进 JSON 之前。

不成对的 U+D800–DFFF 会让部分厂家 JSON 序列化抛错。合法 emoji（成对 surrogate）**不受影响**。正则：高 surrogate 后面不是低，或低前面不是高。

会话文件、剪切板、错误的 UTF-8 解码是脏来源。工具参数 JSON 里的脏字符同样要过这道（各 convert 对 name/arguments 字符串也会 sanitize）。

## 下一课

抽纯文本：[76-utils-text.ts.md](/series/pi-source/ai/137-utils-text-ts/)。
