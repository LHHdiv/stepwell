---
title: "96 · utils/fs-watch.ts — 带错误回调的 fs.watch"
summary: "watchWithErrorHandler(path, listener, onError)：watch throw 或 watcher error 都调 onError，返回 null。closeWatcher 吞 close 异常。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/fs-watch.ts`

`watchWithErrorHandler(path, listener, onError)`：watch throw 或 watcher error 都调 onError，返回 null。`closeWatcher` 吞 close 异常。`FS_WATCH_RETRY_DELAY_MS = 5000` 给调用方重试（主题文件被编辑器原子替换时 Linux 上 watch 会失效）。

主题热更新、footer git 之外的文件监视用。

## 下一课

[97-utils.frontmatter.ts.md](/series/pi-source/coding-agent/649-utils-frontmatter-ts/)
