---
title: "85 · defaults.ts — 思考等级默认值"
summary: "DEFAULTTHINKINGLEVEL = \"medium\"。THINKINGLEVELOPTIONS：off、minimal、low、medium、high、xhigh、max。findInitialModel 和 settings"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/defaults.ts`

`DEFAULT_THINKING_LEVEL = "medium"`。`THINKING_LEVEL_OPTIONS`：off、minimal、low、medium、high、xhigh、max。`findInitialModel` 和 settings 缺省用前者。`clampThinkingLevel` 在别处按模型能力裁。无模型时 sdk 强制 `"off"`（09 课）。

## 下一课

[86-diagnostics.ts.md](/series/pi-source/coding-agent/626-diagnostics-ts/)。
