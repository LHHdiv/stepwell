---
title: "03 · terminal.ts — ProcessTerminal"
summary: "能指出 start 时打开了哪些模式（raw、bracketed paste、Kitty 或 modifyOtherKeys、Windows VT），stop / drainInput 如何避免 SSH 上 Ctrl+D / Kitty"
tags: [pi, tui]
---
源码：`packages/tui/src/terminal.ts`  
被谁调用：`TuiBase.start` → `terminal.start`；所有 `terminal.write`。

## 本课目标

能指出 start 时打开了哪些模式（raw、bracketed paste、Kitty 或 modifyOtherKeys、Windows VT），stop / `drainInput` 如何避免 SSH 上 Ctrl+D / Kitty release 漏到父 shell。能解释 Shift+Enter 在 Apple Terminal 和 Windows 上如何靠 native 修饰键补成 CSI u。

## 在系统中的位置

```text
TuiBase.start
  terminal.start(onInput, onResize)
    setRawMode(true), encoding utf8, resume
    CSI ?2004h                  bracketed paste
    stdout.on("resize")
    refreshTerminalDimensions   POSIX SIGWINCH 给自己
    enableWindowsVTInput
    queryAndEnableKittyProtocol
      setup StdinBuffer
      stdin.on("data")
      写 CSI >7u + CSI ?u + CSI c
```

`Terminal` 接口是最小集：start/stop/drainInput/write/columns/rows/kittyProtocolActive/光标/清屏/标题/OSC 9;4 进度。测试用 `virtual-terminal.ts` 实现同一接口。

## Kitty 协商

一次写出：请求 flags 7（disambiguate + 事件类型 + alternate keys）、查询当前 flags、DA 哨兵。

StdinBuffer 拆出的序列：

- `CSI ? <n> u` → flags≠0 则开 Kitty、关 modifyOtherKeys；0 则 fallback
- `CSI ? ... c`（DA）且还没 Kitty → `CSI >4;2m` modifyOtherKeys
- 半截 `ESC [?` 缓冲 150ms，避免拆包误判

`setKittyProtocolActive` 是 keys.ts 的全局旗标，`matchesKey` 据此决定认不认 CSI u。

修改其它键：xterm 的 `modifyOtherKeys=2`，能把 Ctrl/Alt 组合从原始控制字符升级成 CSI 序列。Kitty 成功后必须关掉，否则重复。

## Shift+Enter

Apple Terminal 和 Windows 控制台常常把 Shift+Enter 送成普通 `\r`。`forwardInputSequence`：若序列是 `\r` 且平台符合，查 `isNativeModifierPressed("shift")`，是则改写成 `\x1b[13;2u`（Kitty 风格），Editor 就能当 `tui.input.newLine`。

`normalizeAppleTerminalInput` 是旧名，内部转调同一函数。

## `resolveEscapeTimeoutMs`

单独 ESC 要等多久才当 Escape 键：默认 10ms；SSH 100ms；`PI_TUI_ESC_TIMEOUT` 可覆盖。StdinBuffer 用这个值。高延迟下 Alt+key（ESC+字母）需要更长窗口。

## `refreshTerminalDimensions`

`process.kill(pid, "SIGWINCH")`。seccomp/LSM 给 EACCES 就吞掉——有回归测试专门防这个 throw。Windows 直接 return。

## `drainInput`

停 TUI 前调用。先 `CSI <u` 关 Kitty（免得还在喷 release），关 modifyOtherKeys，暂时摘掉 inputHandler，听 stdin idle `idleMs`（默认 50）或直到 `maxMs`（1000）。慢 SSH 上 Kitty release 否则会进父 shell。

## `stop`

清进度 OSC、关 2004、关 Kitty、destroy StdinBuffer、摘 listener、**pause stdin**、恢复 wasRaw。pause 注释：防 Ctrl+D 在 raw 关掉后被重新解释成 EOF 关掉父 shell。

## 写与尺寸

`write` → `stdout.write`；`PI_TUI_WRITE_LOG` 可同步 append 一份（目录则按时间戳建文件）。`columns`/`rows`：stdout 的，否则 `COLUMNS`/`LINES`，再否则 80×24。

光标：`CSI nA/B`、`?25l/h`、`K`、`J`、`2J H`。标题 OSC 0。进度 OSC 9;4;3 每秒 keepalive，停时 9;4;0。

## 失败与边界

- 不是 TTY：`setRawMode` 可能不存在，start 仍会写一堆 CSI，测试/管道下注意。
- Kitty 查询无响应：靠 DA fallback；两者都无则只有传统字节。
- native 加载失败：Windows Shift+Tab 可能就是 `\t`；Shift+Enter 就是 `\r`。
- `wasRaw` 在 start 时采样。嵌套 TUI 要 `preserveScreen` 换实例，不要重叠 start。

## 下一课

[04-tui-main-screen.ts.md](/series/pi-source/tui/426-tui-main-screen-ts/)：主屏如何只重画脏行。
