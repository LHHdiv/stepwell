---
title: "87 · utils/text.ts — UTF-8 BOM"
summary: "splitBom / stripBom：若首字符是 \\uFEFF 剥掉。JSON.parse 和 YAML 见 BOM 会炸。Windows 记事本、某些编辑器写 settings.json 会带 BOM。外部编辑器读回 prompt."
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/text.ts`

`splitBom` / `stripBom`：若首字符是 `\uFEFF` 剥掉。JSON.parse 和 YAML 见 BOM 会炸。Windows 记事本、某些编辑器写 settings.json 会带 BOM。外部编辑器读回 prompt.md 也走这里。

## 下一课

[88-utils.json.ts.md](/series/pi-source/coding-agent/631-utils-json-ts/)
