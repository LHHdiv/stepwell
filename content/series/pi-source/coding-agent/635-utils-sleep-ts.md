---
title: "90 · utils/sleep.ts — 可取消的 sleep"
summary: "sleep(ms, signal?)：已 abort 立即 reject Error(\"Aborted\")。否则 setTimeout，abort 时 clearTimeout 再 reject。llama client 轮询用；和 a"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/sleep.ts`

`sleep(ms, signal?)`：已 abort 立即 reject `Error("Aborted")`。否则 setTimeout，abort 时 clearTimeout 再 reject。llama client 轮询用；和 abort.ts 的 AbortError 名字不完全相同（这里是普通 Error）。

## 下一课

[91-utils.ansi.ts.md](/series/pi-source/coding-agent/637-utils-ansi-ts/)
