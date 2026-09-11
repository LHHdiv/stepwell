---
title: "88 · utils/json.ts — 去 // 注释和尾逗号"
summary: "stripJsonComments：两趟 replace，字符串字面量原样保留，// 行注释删掉，对象/数组尾逗号删掉。给宽松 JSON（模型目录、部分配置）用。不是完整 JSON5。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/json.ts`

`stripJsonComments`：两趟 replace，字符串字面量原样保留，`//` 行注释删掉，对象/数组尾逗号删掉。给宽松 JSON（模型目录、部分配置）用。不是完整 JSON5。

块注释 `/* */` 不处理。字符串里的 `//` 因先匹配 quoted string 而安全。

## 下一课

[89-utils.abort.ts.md](/series/pi-source/coding-agent/633-utils-abort-ts/)
