---
title: "20 · cli/project-trust.ts — 信任对话框的 CLI 适配器"
summary: "分清两层：core 的 resolveProjectTrusted 是策略（覆盖旗标、trust.json、扩展事件、ask/always/never）；本文件只提供 ProjectTrustContext.ui，让策略能在 TTY 上"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/cli/project-trust.ts`  
被谁调用：`main.ts`、`package-manager-cli.ts`。真正判定在 `core/project-trust.ts`。

## 本课目标

分清两层：core 的 `resolveProjectTrusted` 是策略（覆盖旗标、trust.json、扩展事件、ask/always/never）；本文件只提供 `ProjectTrustContext.ui`，让策略能在 TTY 上问人。print/json/rpc 没有选择器。

## 在系统中的位置

```text
main.ts
  createProjectTrustContext({ cwd, mode, settingsManager, hasUI })
  resolveProjectTrusted({ ..., projectTrustContext })   → 79 课
    ctx.ui.select / confirm / input / notify
      → showStartupSelector / showStartupInput
```

`mode` 从 `AppMode` 映射：`interactive` 变成 context 里的 `"tui"`，其余原样。扩展的 `project_trust` 事件靠这个区分能不能弹 UI。

## `createProjectTrustContext`

四个 UI 方法：

| 方法 | 有 TUI 且 interactive | 否则 |
|---|---|---|
| `select` | `showStartupSelector`，选项 label=value | `undefined` |
| `confirm` | Yes/No 选择器，取消当 false | `false` |
| `input` | `showStartupInput` | `undefined` |
| `notify` | 交互模式静默（TUI 自己会画） | 非交互：chalk 打到 stderr |

`hasUI === false` 时 select/input 直接空，confirm 假。这就是 `--print` 遇到未信任项目默认不加载项目扩展的原因：策略层看到 `hasUI: false` 后，ask 模式返回 false。

## 失败与边界

本文件不读写 `trust.json`。不调用扩展。取消选择器 = 未作答，core 当成不信任。confirm 把 title 和 message 拼成一行给选择器标题，没有独立的确认组件。

## 下一课

[21-config-selector.ts.md](/series/pi-source/coding-agent/496-config-selector-ts/)：`pi config` 的全屏配置 TUI。
