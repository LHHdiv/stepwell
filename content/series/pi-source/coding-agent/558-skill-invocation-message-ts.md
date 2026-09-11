---
title: "52 · skill-invocation-message.ts — /skill:foo 的折叠块"
summary: "无。expand 同全局工具展开。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/skill-invocation-message.ts`  
谁创建：用户消息 `parseSkillBlock` 命中时。人话部分另挂 `UserMessageComponent`。

## 订阅什么

无。expand 同全局工具展开。

## 画什么

紫底。折叠：`[skill] name (hint)`；展开：标签 + `**name**` + skill 文件正文 Markdown。

## 失败与边界

只画 skill 块本身，避免把用户后附的问题藏进折叠里。

## 下一课

选择器系列从扩展通用选择器开始：[53-extension-selector.ts.md](/series/pi-source/coding-agent/560-extension-selector-ts/)
