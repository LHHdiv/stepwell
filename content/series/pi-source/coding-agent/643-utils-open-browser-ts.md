---
title: "94 · utils/open-browser.ts — 打开 URL"
summary: "darwin open、win32 rundll32 url.dll,FileProtocolHandler、其它 xdg-open。绝不 cmd /c start：cmd 会再解析 &|^，OAuth URL 可被注入。spawn d"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/open-browser.ts`

darwin `open`、win32 `rundll32 url.dll,FileProtocolHandler`、其它 `xdg-open`。**绝不** `cmd /c start`：cmd 会再解析 `&|^`，OAuth URL 可被注入。spawn detached、stdio ignore、error 吞掉——调用方已经把 URL 画在终端上了。

## 下一课

[95-utils.child-process.ts.md](/series/pi-source/coding-agent/645-utils-child-process-ts/)
