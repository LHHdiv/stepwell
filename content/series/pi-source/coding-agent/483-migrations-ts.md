---
title: "14 · migrations.ts — 启动时一次性搬家"
summary: "分清「自动搬走」和「只警告不改」。读完应能指出 auth.json 从哪两份旧文件拼出来、v0.30 会话为什么躺在 ~/.pi/agent/.jsonl。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/migrations.ts`  
被谁调用：`main.ts` 在解析完 argv、选定 cwd 之后 `runMigrations(cwd)`。交互模式还会把返回的 `deprecationWarnings` 交给 `showDeprecationWarnings`（按任意键继续）。

## 本课目标

分清「自动搬走」和「只警告不改」。读完应能指出 `auth.json` 从哪两份旧文件拼出来、v0.30 会话为什么躺在 `~/.pi/agent/*.jsonl`。

## 在系统中的位置

```text
main
  runMigrations(cwd)
    migrateAuthToAuthJson
    migrateSessionsFromAgentRoot
    migrateToolsToBin
    migrateKeybindingsConfigFile
    migrateExtensionSystem   → commands/→prompts/，并收集 hooks/tools 警告
  返回 { migratedAuthProviders, deprecationWarnings }
```

全部同步、幂等：跑第二次应是空操作。失败按文件吞掉，不让启动死在半份坏 JSON 上。

## `migrateAuthToAuthJson`

若 `auth.json` 已存在，直接 `return []`。否则：

1. 读 `oauth.json`，每个 provider 写成 `{ type: "oauth", ...旧字段 }`，原文件改名为 `oauth.json.migrated`。
2. 读 `settings.json` 的 `apiKeys` 对象，尚未出现过的 provider 写成 `{ type: "api_key", key }`，然后删掉 `apiKeys` 写回 settings。
3. 若有任何条目，`auth.json` 以 `0o600` 写出。

返回被迁移的 provider 名。交互模式拿它弹黄字：「Migrated credentials to auth.json: …」。

解析失败（BOM、坏 JSON）进 `catch` 跳过。`stripBom` 来自 `utils/text.ts`：Windows 记事本存的 UTF-8 BOM 不能让 `JSON.parse` 炸。

## `migrateSessionsFromAgentRoot`

v0.30.0 的 bug：会话写到 `~/.pi/agent/*.jsonl`，而不是 `sessions/<encoded-cwd>/`。本函数只扫 **agentDir 这一层** 的 `.jsonl`（不进子目录）。

读第一行，必须是 `{ type: "session", cwd }`。编码规则和 `session-manager.ts` 相同：

```text
--${cwd 去掉盘符斜杠，把 / \ : 换成 -}--
```

目标已存在则跳过（不覆盖新会话）。读不了的文件跳过。

## `migrateCommandsToPrompts` / `migrateExtensionSystem`

全局 `~/.pi/agent/commands` 和项目 `.pi/commands`，若还没有 `prompts/`，`renameSync` 过去。hooks 改名为 extensions 之后，目录名也从 commands 换成 prompts。

`checkDeprecatedExtensionDirs`：若仍有 `hooks/`，或 `tools/` 里除了 `fd`/`rg` 还有别的文件，只收集警告字符串，**不删用户文件**。

## `migrateToolsToBin`

把 `tools/fd`、`tools/rg`（含 `.exe`）挪到 `getBinDir()`。目标已在就删旧的。这是托管二进制的搬家，不是用户自定义 tools 目录。

## `migrateKeybindingsConfigFile`

读 `keybindings.json`，交给 `migrateKeybindingsConfig`（`core/keybindings.ts`）把旧动作名改成新的。没变化不写盘。坏 JSON 忽略。

## `showDeprecationWarnings`

有警告才：黄字打印、给迁移指南 URL、stdin raw mode 等任意键。print/RPC 模式 `main` 可能不调这个（非 TTY 会卡住）。看 `main.ts` 的调用条件。

## `runMigrations`

按上面顺序跑完，返回两个数组。`main` 把 `migratedAuthProviders` 传给 `InteractiveMode` 选项。

## 失败与边界

- 全部「能迁就迁，迁不了就算了」。用户磁盘只读时启动仍要能进 TUI。
- 不处理跨机器路径：会话 header 里的 `cwd` 是当时的绝对路径，换机器后目录名对不上，文件会躺在错误的 `sessions/` 子目录。这是历史格式限制。
- `auth.json` 一旦存在，旧 `oauth.json` 不会再被读。手工合并两份凭证要自己做。

## 下一课

[15-package-manager-cli.ts.md](/series/pi-source/coding-agent/485-package-manager-cli-ts/) — `pi install/update/list/config` 这条不上 Runtime 的旁路。
