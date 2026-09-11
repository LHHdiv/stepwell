---
title: "101 · settings-diagnostics.ts — 把 settings 读失败变成启动 warning"
summary: "collectSettingsDiagnostics：settingsManager.drainErrors() → { type: \"warning\", message: Invalid settings file … }。 dedu"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/settings-diagnostics.ts`

`collectSettingsDiagnostics`：`settingsManager.drainErrors()` → `{ type: "warning", message: Invalid settings file … }`。  
`deduplicateDiagnostics`：按 type+message 去重，因为启动 SettingsManager 和 runtime 里可能各报一次同一文件。

error 级诊断仍来自扩展加载失败等，不在本文件。

## 下一课

[102-source-info.ts.md](/series/pi-source/coding-agent/658-source-info-ts/)。
