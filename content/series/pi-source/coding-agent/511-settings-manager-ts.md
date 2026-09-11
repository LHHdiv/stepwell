---
title: "28 · settings-manager.ts — 两份 JSON 合成一份生效设置"
summary: "记住三层：磁盘上的 global、磁盘上的 project、内存里 merge 后的 this.settings。项目未信任时 project 当 {}。setter 只标脏字段，flush 才带锁写回，避免把别人刚改的键覆盖掉。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/settings-manager.ts`（约 1400 行）  
被谁调用：`main` 最早创建；`createAgentSessionServices` 通常接收已有实例；TUI `/settings`、包管理、压缩参数都读它。

## 本课目标

记住三层：磁盘上的 global、磁盘上的 project、内存里 merge 后的 `this.settings`。项目未信任时 project 当 `{}`。setter 只标脏字段，`flush` 才带锁写回，避免把别人刚改的键覆盖掉。

## 在系统中的位置

```text
SettingsManager.create(cwd, agentDir, { projectTrusted })
  FileSettingsStorage
    ~/.pi/agent/settings.json
    <cwd>/.pi/settings.json
  deepMerge(global, project) → this.settings
ResourceLoader / ModelRuntime 选项 / AgentSession 压缩
  settingsManager.getXxx()
```

`Settings` 接口是产品旋钮清单：默认模型、compaction、retry、packages、defaultTools、theme、httpIdleTimeoutMs、defaultProjectTrust 等。不必背全字段，用到哪读哪。

## 创建

`create` 走文件。`inMemory` 给测试和启动期「不信任项目」的主题加载。`fromStorage` 可插自定义后端。

读文件：`withLock` 只读时，文件不存在则不创建目录。JSON `stripBom` + `migrateSettings`（queueMode→steeringMode、websockets bool→transport、旧 skills 对象、retry.maxDelayMs）。

parse 失败：该 scope 变成 `{}`，error 记进 `errors`，**进程继续**。`collectSettingsDiagnostics` 把它们变成启动 warning。

## merge

`deepMergeSettings`：嵌套对象递归，数组和标量项目覆盖全局。`projectTrusted === false` 时根本不读项目文件。

## 写入策略

每个 `setXxx` 把键放进 `modifiedFields` 或 `modifiedProjectFields`（嵌套还有 `modifiedNestedFields`）。`flush`：

1. 对每个脏 scope `storage.withLock`
2. 重新读磁盘当前 JSON
3. **只把本次会话改过的键**写进去
4. 清脏集合

proper-lockfile，ELOCKED 同步忙等最多 10 次 × 20ms。这是多进程（两个 pi、或 `pi config` 同时开）的保护。

`reload()` 再读盘并重新 merge，保留当前 `projectTrusted`。ResourceLoader.reload 会调它。

## 和工具/会话相关的 getter

`getDefaultTools()` → sdk 的 `initialActiveToolNames`。  
`getCompaction()` → AgentSession `_checkCompaction`。  
`getShellCommandPrefix` / `getShellPath` → bash 工具。  
`getImageAutoResize` → read 工具。  
`getHttpIdleTimeoutMs` → sdk `streamFn` 超时。  
`getDefaultProjectTrust`：**仅全局**，项目 settings 不能改这个（避免恶意项目自称 always trusted）。

## 失败与边界

坏 JSON 不 throw 出 create。未信任项目的 setter 若写 project scope，实现上仍可能记 dirty，但加载时项目是空的——交互里 `/trust` 之后要 reload。`defaultProjectTrust` 不能从项目文件来。

## 下一课

[29-resource-loader.ts.md](/series/pi-source/coding-agent/513-resource-loader-ts/)：扩展、Skill、模板、AGENTS.md 一次扫盘。
