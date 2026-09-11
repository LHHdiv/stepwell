---
title: "79 · project-trust.ts — 项目扩展能不能跑"
summary: "resolveProjectTrusted 返回 boolean。true 才读 cwd/.pi/settings.json 和项目扩展。顺序固定，前面成功后面不再问："
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/project-trust.ts`  
被谁调用：`main` 在创建会执行项目扩展的 SettingsManager/ResourceLoader 之前。

## 本课目标

`resolveProjectTrusted` 返回 boolean。true 才读 `cwd/.pi/settings.json` 和项目扩展。顺序固定，前面成功后面不再问：

1. `trustOverride`（`--approve` / `--no-approve`）直接返回
2. `hasTrustRequiringProjectResources` 为假 → true（没东西可怕）
3. 扩展 `project_trust` 事件若给出 yes/no：用它；`remember` 则写入 trust store
4. `trustStore.get(cwd)` 已有决定（含父目录继承）
5. 全局 `defaultProjectTrust`：always / never / ask
6. ask 且 `hasUI`：选择器（Trust / Trust parent / session only / Do not trust）
7. 无 UI：false

文案说明信任后会加载 `.pi`、装缺失包、执行项目扩展。

## 失败与边界

扩展 handler 抛错进 `onExtensionError`，不自动当信任。取消选择器 → false。session only 的 updates 为空，不写 `trust.json`。

## 下一课

[80-trust-manager.ts.md](/series/pi-source/coding-agent/615-trust-manager-ts/)。
