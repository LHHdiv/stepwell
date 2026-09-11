---
title: "30 · autocomplete.ts — 路径与斜杠命令"
summary: "AutocompleteProvider.getSuggestions(prefix, ...): AutocompleteSuggestions | Promise<...>。CombinedAutocompleteProvider "
tags: [pi, tui]
---
源码：`packages/tui/src/autocomplete.ts`（约 826 行）

## 本课目标

`AutocompleteProvider.getSuggestions(prefix, ...): AutocompleteSuggestions | Promise<...>`。`CombinedAutocompleteProvider` 拼：slash 命令、文件路径（`fd` 或 `readdir`）、自定义。Editor 只认这份接口。

## 路径前缀

`extractQuotedPrefix` / `parsePathPrefix`：支持 `"...`、`@"...`、`@path`、普通 token。`PATH_DELIMITERS` 空格/tab/引号/`=`。`~` 扩 homedir。

有 `fd`：`buildFdPathQuery` 把 `/` 段变成正则，spawn fd。没有则 `readdirSync` + `fuzzyFilter`。

## Slash

`SlashCommand { name, description, ... }`。前缀 `/` 时过滤。选中插入 `/name `。

## 失败与边界

- `fd` 失败应落到 readdir，不要把异常抛进 Editor。
- 同步 readdir 大目录会卡住 render。这是已知取舍。
- triggerCharacters 由 provider 声明，Editor 用来建正则。

## 下一课

[31-fuzzy.ts.md](/series/pi-source/tui/453-fuzzy-ts/)。
