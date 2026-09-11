---
title: "68 · utils/json-parse.ts — 流式工具参数怎么变成对象"
summary: "repairJson：字符串里的裸控制字符转义、非法 \\ 变 \\\\。Anthropic 偶发。"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/json-parse.ts`  
被谁调用：所有协议的 `toolcall_delta`：`block.arguments = parseStreamingJson(partialJson)`。

## 三层

`repairJson`：字符串里的裸控制字符转义、非法 `\` 变 `\\`。Anthropic 偶发。

`parseJsonWithRepair`：先 `JSON.parse`，失败才 repair 再 parse，repair 没改则抛原错。

`parseStreamingJson`：空 → `{}`。完整 parse 失败 → `partial-json` 库（补全未闭合的括号）。再失败 repair+partial。再失败 `{}`。**永不 throw**。

所以 UI 上工具参数是「目前能看出的字段」，`toolcall_end` 再 parse 一次才接近最终。`length` 截断时仍可能是半对象——Agent 不执行。

## 失败与边界

`partial-json` 可能把 `"{\"a\":"` 理解成 `{}`。数字截在 `1e` 之类会丢字段。这是展示用尽力而为，不是安全解析器。

## 下一课

诊断数组：[69-utils-diagnostics.ts.md](/series/pi-source/ai/130-utils-diagnostics-ts/)。
