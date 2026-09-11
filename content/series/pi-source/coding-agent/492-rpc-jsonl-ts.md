---
title: "19 · jsonl.ts — 只按 LF 切的 JSONL"
summary: "看清「JSONL」在本项目里的精确定义：记录分隔符只有 \\n。JSON 字符串里可以出现 U+2028 / U+2029。Node readline 会把这两种 Unicode 行分隔符也切开，从而把一条合法 JSON 劈成两半。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/rpc/jsonl.ts`  
被谁调用：`rpc-mode.ts` 读 stdin、`rpc-client.ts` 读子进程 stdout。

## 本课目标

看清「JSONL」在本项目里的精确定义：记录分隔符只有 `\n`。JSON 字符串里可以出现 U+2028 / U+2029。Node `readline` 会把这两种 Unicode 行分隔符也切开，从而把一条合法 JSON 劈成两半。

## `serializeJsonLine`

```ts
return `${JSON.stringify(value)}\n`;
```

`JSON.stringify` 会把字符串里的 `\n` 转义成 `\\n`，所以 payload 内部换行不会破坏 framing。U+2028 在 JSON 里是合法字符，不会被转义——这正是必须自己分帧的原因。

## `attachJsonlLineReader`

对 `Readable` 挂 `data` / `end`：

1. `StringDecoder("utf8")` 拼 chunk，避免多字节字符被切开。
2. buffer 里找 `\n`，前面一段作为一行。若行尾是 `\r`（CRLF），剥掉。**不**按 `\r` 单独分行。
3. `end` 时 decoder.end()，若 buffer 非空也 emit 一次（最后一行可以没有 LF）。
4. 返回 detach 函数：`off("data")` + `off("end")`。

没有 backpressure 逻辑。背压在 `output-guard.ts` 的 `waitForRawStdoutBackpressure`，由 rpc-mode 在写完后再 await。

## 失败与边界

- 非法 JSON 不在这里解析。调用方 `JSON.parse`，失败则回 `{ command: "parse", success: false }`。
- 超长行会把整个 buffer 堆在内存里。rpc-mode 没有行长度上限；experimental 的 coordinator 另有 `MAX_CONTROL_LINE_BYTES`。
- 不要把这个 reader 用到「可能夹杂日志」的流上。非 JSON 行会传到回调，由上层忽略或报错。

## 下一课

[20-rpc-mode.ts.md](/series/pi-source/coding-agent/495-rpc-mode-ts/) — 服务端如何把命令变成 `session.prompt`。
