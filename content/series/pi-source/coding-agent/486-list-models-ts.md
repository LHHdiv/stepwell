---
title: "16 · list-models.ts — 把可用模型打成对齐表"
summary: "看清「可用」来自 modelRuntime.getAvailable()：有认证、组合成功能 stream 的模型。不是 models.json 里写过的全部。搜素是 fuzzyFilter，字段是 provider + id。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/list-models.ts`  
被谁调用：`main.ts` 看到 `--list-models` 短路；扩展帮助也会提到它。

## 本课目标

看清「可用」来自 `modelRuntime.getAvailable()`：有认证、组合成功能 stream 的模型。不是 `models.json` 里写过的全部。搜素是 `fuzzyFilter`，字段是 `provider + id`。

## 在系统中的位置

```text
main.ts
  createAgentSessionServices / 或更早的 ModelRuntime
  listModels(runtime, searchPattern, signal)
  process.exit(0)
```

发生在创建 `AgentSession` 之前。没有会话文件副作用。

## `listModels` 逐步

1. `getError()` 有值：黄字 warning 打到 stderr，继续（部分厂家坏了仍列出其余）。
2. `getAvailable()` 为空：`formatNoModelsAvailableMessage()`（指向 `/login` 和 docs）。
3. 有 `searchPattern`：`fuzzyFilter(models, pattern, m => provider + " " + id)`。0 命中打印 `No models matching "…"`。
4. 按 provider、再按 id 排序。
5. 列：provider、model、context（token 窗口）、max-out、thinking（`m.reasoning`）、images（`m.input` 含 `"image"`）。
6. 列宽取 header 与所有行的 max，空格对齐。

`formatTokenCount`：≥1M 用 `1M` / `1.5M`，≥1K 用 `200K`。整数不带小数点。

## 失败与边界

`getAvailable` 可能联网刷新认证状态；`signal` 来自 main 的启动超时。模糊搜索不匹配 `name` 显示名，只匹配 provider 与 id。thinking 列是「模型是否声明 reasoning」，不是当前会话的 thinking level。

## 下一课

[17-file-processor.ts.md](/series/pi-source/coding-agent/488-file-processor-ts/)：`@file` 如何变成 prompt 文本和图片。
