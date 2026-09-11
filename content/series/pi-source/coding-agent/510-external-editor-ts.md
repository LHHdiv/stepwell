---
title: "28 · external-editor.ts — $VISUAL 里改草稿"
summary: "看交互如何把当前编辑器内容交给外部 vim/notepad，又无损拿回来。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/external-editor.ts`  
被谁调用：`InteractiveMode` 的 `app.editor.external`；`ExtensionEditorComponent` 的 Ctrl+G。

## 本课目标

看交互如何把当前编辑器内容交给外部 vim/notepad，又无损拿回来。

## `editInExternalEditor`

1. `mkdtempSync(tmpdir()/pi-editor-)` 写 `prompt.md`。
2. `options.command.split(" ")` 第一段当可执行文件，其余当参数，最后附上文件路径。
3. **`spawn` 不是 `spawnSync`**。注释：Windows 上 sync spawn 会让 libuv 继续占控制台输入，和 vim 抢缓冲直到 Ctrl+C。
4. `stdio: "inherit"`，Windows 额外 `shell: true`（路径里常有空格）。
5. 退出码非 0 或 spawn error → `{ status: "failed" }`。成功则 `stripBom` 读回，去掉末尾单个 `\n`。
6. `finally` 删临时目录。

调用方（InteractiveMode）在外部编辑期间必须先 `ui.stop()` 把终端还给 vim，回来再 `ui.start()`。本文件不管 TUI。

## 失败与边界

- `command.split(" ")` 切不了带空格的可执行路径，除非 Windows shell 模式。设置项应写成 `vim` 或完整无空格路径。
- 用户在 vim 里 `:cq` 会 failed，编辑器内容保持原样。

## 下一课

[29-model-search.ts.md](/series/pi-source/coding-agent/512-model-search-ts/)
