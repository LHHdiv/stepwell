---
title: "config.ts — 路径与产品名的唯一真相"
summary: "所有「主题、README、~/.pi、包根目录」路径都必须经过这里。开发文档也写了：不要自己拼 dirname 去找资源。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/config.ts`  
被谁调用：几乎所有 CLI / 会话代码。`setupCli` 要 `APP_NAME`，`main` 要 `getAgentDir()` / `VERSION`。

## 这个文件在系统里的位置

所有「主题、README、~/.pi、包根目录」路径都必须经过这里。开发文档也写了：不要自己拼 `__dirname` 去找资源。

三种发行形态共用一份源码：

| 形态 | 怎么跑 | 资源在哪 |
|---|---|---|
| tsx 源码（`./pi-test.sh`） | 直接执行 `src/` | 包根的 `src/modes/...` |
| Node dist | `dist/bundle/cli.js` | 包根的 `dist/modes/...` |
| Bun 单文件二进制 | `process.execPath` 旁边 | 可执行文件旁的 `theme/`、`assets/` |

本课只读启动相关：发行形态、包资源、可 fork 的名字、用户数据目录。后半的 `detectInstallMethod` / `getSelfUpdateCommand` 是 `pi update` 用的，装配课之后再进。

## 依赖谁、被谁调用

- 依赖：`fs` / `path` / `os`、`utils/child-process.ts`、`utils/paths.ts`、`utils/text.ts`
- 被调用：`cli/setup.ts`、`main.ts`、`SettingsManager`、`SessionManager`、主题、导出 HTML、自更新
- 不调用 Agent、不读 settings.json

---

## 发行形态检测

```ts
export const isBunBinary =
	import.meta.url.includes("$bunfs") || import.meta.url.includes("~BUN") || import.meta.url.includes("%7EBUN");

export const isBunRuntime = !!process.versions.bun;

declare const PI_BUNDLED_NODE: boolean;
export const isBundledNode = typeof PI_BUNDLED_NODE !== "undefined" && PI_BUNDLED_NODE;
```

`isBunBinary`：编译进 Bun 虚拟文件系统。`isBundledNode`：esbuild 打进 Node 发行版时注入的编译期常量，源码里平时是 `false`。

`getPackageDir()` 按这个分叉：Bun 二进制用可执行文件目录；否则从 `__dirname` 往上找带 `package.json` 的目录。`PI_PACKAGE_DIR` 可覆盖（Nix/Guix 的 store 路径不好从 URL 推断）。

`findNodePackageDir` 有一个坑：`build:binary` 会把 Bun 元数据拷进 `dist/`。若当前目录名叫 `dist` 且上一级也有 `package.json`，返回上一级，避免资源路径变成 `dist/dist/`。

## 包内资源路径

| 函数 | tsx | Node dist | Bun 二进制 |
|---|---|---|---|
| `getThemesDir()` | `src/modes/interactive/theme/` | `dist/modes/interactive/theme/` | 可执行文件旁 `theme/` |
| `getExportTemplateDir()` | `src/core/export-html/` | `dist/core/export-html/` | `export-html/` |
| `getInteractiveAssetsDir()` | `src/modes/interactive/assets/` | 同上结构 | `assets/` |
| `getReadmePath()` / `getDocsPath()` / `getExamplesPath()` / `getChangelogPath()` | 包根对应文件 | 同左 | 同左（拷进发行物） |

tsx 与 dist 的差别靠「包根下有没有 `src/` 目录」判断，不是靠 `import.meta.url` 再分一次。

## 可 fork 的产品名

启动时读一次包根 `package.json`：

```ts
export const PACKAGE_NAME: string = pkg.name || "@earendil-works/pi-coding-agent";
export const APP_NAME: string = piConfigName || "pi";
export const APP_TITLE: string = piConfigName ? APP_NAME : "π";
export const CONFIG_DIR_NAME: string = pkg.piConfig?.configDir || ".pi";
export const VERSION: string = pkg.version || "0.0.0";
export const ENV_AGENT_DIR = `${APP_NAME.toUpperCase()}_CODING_AGENT_DIR`;
export const ENV_SESSION_DIR = `${APP_NAME.toUpperCase()}_CODING_AGENT_SESSION_DIR`;
```

`package.json` 的 `piConfig`：

```json
{
  "piConfig": { "configDir": ".pi" }
}
```

改 `name` / `configDir` / `bin` 就能 fork 成另一个 CLI：进程标题、配置目录、环境变量（`PI_CODING_AGENT_DIR` → `TAU_CODING_AGENT_DIR`）跟着变。`setupCli` 里的 `process.title = APP_NAME` 走这里。

读 `package.json` 失败：只有 `ENOENT` 被吞成空对象，其它错误抛出。没有 package.json 时名字退回默认值，版本是 `"0.0.0"`。

## 用户数据路径（不是源码）

`getAgentDir()`：默认 `~/.pi/agent/`，可被 `PI_CODING_AGENT_DIR` 覆盖。`expandTildePath` 实际走 `normalizePath`，把 `~` 展开和斜杠统一交给路径工具。

| 函数 | 默认路径 |
|---|---|
| `getSettingsPath()` | `~/.pi/agent/settings.json` |
| `getAuthPath()` | `~/.pi/agent/auth.json` |
| `getModelsPath()` | `~/.pi/agent/models.json` |
| `getSessionsDir()` | `~/.pi/agent/sessions/` |
| `getCustomThemesDir()` | `~/.pi/agent/themes/` |
| `getPromptsDir()` | `~/.pi/agent/prompts/` |
| `getToolsDir()` | `~/.pi/agent/tools/` |
| `getBinDir()` | `~/.pi/agent/bin/`（托管的 fd、rg） |
| `getDebugLogPath()` | `~/.pi/agent/pi-debug.log` |

后面的 `SettingsManager` / `AuthStorage` / `SessionManager` 都是这些路径的使用者。业务代码不自己拼 `homedir()`。

`getShareViewerUrl`：`/share` 把 gist id 拼到 `https://pi.dev/session/`，可被 `PI_SHARE_VIEWER_URL` 覆盖。本课可记门牌。

## 本课跳过

`detectInstallMethod`、`getSelfUpdateCommand`、`getUpdateInstruction`：判断当前安装是 npm / pnpm / yarn / bun / bun-binary，拼出 `pi update` 该跑的命令。读 `package-manager-cli.ts` 时再回来。

## 失败时

`getPackageJsonPath()` 读盘失败且不是文件不存在 → 进程起不来。路径函数本身不访问网络。

## 读完应能指着源码说的

1. 为什么不能写 `__dirname + '/theme'`。
2. `APP_NAME` 从哪来，fork 要改哪。
3. `~/.pi/agent` 和项目里的 `.pi/` 不是一回事：前者是 `getAgentDir()`，后者是项目级资源，由 resource-loader 按 cwd 扫。

## 下一个文件

[06-args.ts.md](/series/pi-source/coding-agent/472-args-ts/)（`src/cli/args.ts`）。`main` 把 argv 变成 `Args` 之后才谈得上创建会话。
