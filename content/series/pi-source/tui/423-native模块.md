---
title: "01 · native 模块 — darwin / linux / win32 的 C 绑定"
summary: "TS 侧加载：38-native-platform.ts.md。本课只读 C。"
tags: [pi, tui]
---
源码：

- `packages/tui/native/napi.h` — 无 Node 头文件的 N-API 解析
- `packages/tui/native/clipboard.h` — 异步剪贴板 job
- `packages/tui/native/darwin/src/darwin-platform.m`
- `packages/tui/native/linux/src/linux-platform-x11.c` + `clipboard-worker.h`
- `packages/tui/native/win32/src/win32-platform.c`

TS 侧加载：[38-native-platform.ts.md](/series/pi-source/tui/460-native-platform-ts/)。本课只读 C。

## 本课目标

能说出三个平台各自导出哪些函数、剪贴板为什么必须异步、Linux 为何再加一条私有线程。知道 prebuild 路径：`native/<os>/prebuilds/<os>-<arch>/<os>-platform[.suffix].node`。

## 在系统中的位置

```text
getNativeClipboard() / getNativePlatformHelper()
  process.dlopen 对应 .node
    napi_register_module_v1
      getText / getImage [/ setText] [/ isModifierPressed] [/ enableVirtualTerminalInput]
```

Editor 粘贴、AltScreen copy-on-select、Apple Terminal / Windows 的 Shift+Enter 探测、Windows VT 输入，都经这里。加载失败则 JS 走降级（OSC 52、命令行剪贴板、Shift+Enter 分不清）。

## `napi.h` — 不链 Node

没有 `node_api.h`。`node_symbol("napi_create_function")`：

- Unix：`dlsym(RTLD_DEFAULT, name)`
- Windows：先 `GetProcAddress(GetModuleHandle(0))`，再 `node.dll`

函数指针 typedef 覆盖本包用到的最小表面：create function/string/buffer/promise/async_work、get_cb_info、throw_error。`set_function_export` 把 C 回调挂到 `exports`。调用约定 Windows 是 `__cdecl`，导出 `__declspec(dllexport)`。

这样 Bun 和 Node 都能加载同一份预编译，只要运行时导出了这些 napi_* 符号。

## `clipboard.h` — 主线程不碰系统剪贴板

`clipboard_job`：async_work、deferred、operation（TEXT/IMAGE/WRITE）、format、data、error。

`queue_clipboard`：分配 job →（写则从 JS 字符串拷到 job->data）→ `napi_create_async_work` + promise → 队列。

`clipboard_execute` **只在 worker 跑**，且不得调 N-API（头文件写明）。平台文件实现它。

`complete_clipboard_work` 回到 JS 线程：按 format 做 utf8/latin1/utf16/buffer/null，settle promise，删 work，释放。取消则 error `"Clipboard operation cancelled"`。

`PI_CLIPBOARD_WRITE` 宏：darwin/win32 打开写；Linux 不定义——写仍走命令行，因为 X11 所有权要进程活着当 owner，短命 helper 写完就丢。

分配：Unix `calloc`/`free`；Windows `GlobalAlloc(GPTR)`/`GlobalFree`。Windows 拷贝用 volatile 逐字节，避开被优化掉的 memcpy 敏感路径。

## Darwin（`darwin-platform.m`）

AppKit。导出：`isModifierPressed`、`getText`、`setText`、`getImage`。

- 修饰键：`CGEventSourceFlagsState(kCGEventSourceStateCombinedSessionState)` 对 shift/command/control/option 掩码。
- 剪贴板：`NSPasteboard generalPasteboard`。写 `NSPasteboardTypeString`。读 UTF-8。图片优先 PNG，否则 TIFF → NSBitmapImageRep → PNG buffer。
- `@autoreleasepool` 包住 execute。

构建：`native/darwin/build.sh`，xcrun clang，打 arm64（macOS 11+）和 x64（10.15+）。可 osxcross 交叉，纯 clang/Zig 不够。

## Linux X11（`linux-platform-x11.c` + `clipboard-worker.h`）

只导出 `getText` / `getImage`。链接 `libxcb`。prebuild 名带 `-x11` 后缀。JS 侧还要求 `process.env.DISPLAY`。

读选择：隐窗口、`ConvertSelection`、等 `SELECTION_NOTIFY`、读 property。INCR 增量有上限 `MAX_CLIPBOARD_BYTES`（50MiB）和 `CLIPBOARD_TIMEOUT_MS`（2s）。文本类型优先 utf-8 / UTF8_STRING / STRING（latin1）；图片 png/jpeg/webp/gif/bmp/tiff。有的 owner 拒 TARGETS 但仍给 UTF8_STRING，代码为此留了退路。

**为什么另有 worker 线程：** X11 读可能卡住。`clipboard-worker.h` 用私有 pthread：libuv 线程只 `pthread_cond_timedwait` 最多约 3 秒。超时则标 busy，晚到的结果丢掉，helper 在那次完成前对其它调用返回 unavailable。条件变量用 `CLOCK_MONOTONIC`，符号经 `node_symbol("pthread_cond_*")` 避免 glibc x64 上绑到过时的 unversioned ELF。

Wayland 读 / 所有 Linux 写：JS 走 `wl-paste` / `xclip` 等，不进这个 .node。

测试用 Xvfb，不碰桌面剪贴板。

## Win32（`win32-platform.c`）

导出：`enableVirtualTerminalInput`、`isModifierPressed`、`getText`、`setText`、`getImage`。链 `kernel32` + `user32`。

- VT：`GetStdHandle(STD_INPUT_HANDLE)` 加上 `ENABLE_VIRTUAL_TERMINAL_INPUT`。必须在 `setRawMode(true)` **之后**（JS 里 `ProcessTerminal.start` 的顺序），因为 raw mode 会重置 console mode。
- 修饰键：`GetAsyncKeyState`，command 映射 Win 键。
- 剪贴板：`OpenClipboard` 重试 10 次 × 5ms。文本 UTF-16。图片：PNG 格式优先，否则 DIB/DIBV5 拼 BMP 文件头（自己算 palette / bitfields 偏移）。

`PI_TEST_NATIVE_CLIPBOARD=1` 才会跑写回测试，**会覆盖系统剪贴板**。

## 失败与边界

| 情况 | 行为 |
|---|---|
| 无 .node / arch 不是 x64/arm64 | JS helper undefined，功能降级 |
| Linux 无 DISPLAY | 不加载 |
| 剪贴板空 | resolve `null`（不是 undefined；undefined 表示 helper 不可用） |
| Linux 卡住 | 本次 unavailable，完成前别人也读不到 |
| 主线程调系统剪贴板 | 禁止；macOS/Win 会停 UI |

## 下一课

[02-tui.ts.md](/series/pi-source/tui/424-tui-ts/)：`start` / `stop` 和组件树。native 的 TS 加载器排在管线末尾 38–40 课。
