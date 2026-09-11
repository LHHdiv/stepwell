---
title: "13 · .gitattributes — 换行是跨平台契约"
summary: "理解为什么默认全部 LF，却单独把 .bat / .cmd / .ps1 钉成 CRLF。这不是审美：shebang 脚本在 LF 下工作，cmd.exe 在纯 LF 的 .bat 上会把最后一行和 \\r 问题搞得很惨。"
tags: [pi, root]
---
源码：`.gitattributes`  
被谁调用：git 在 checkout / add 时按属性转换 EOL；GitHub 的 diff / linguist 也读。运行时不读。`pi-test.bat` 能在 Windows 上被 cmd 执行，靠的就是 `*.bat text eol=crlf`。

## 本课目标

理解为什么默认全部 LF，却单独把 `*.bat` / `*.cmd` / `*.ps1` 钉成 CRLF。这不是审美：shebang 脚本在 LF 下工作，cmd.exe 在纯 LF 的 `.bat` 上会把最后一行和 `\r` 问题搞得很惨。

## 在仓库中的位置

```text
* text=auto eol=lf          默认：文本文件入库/出库都 LF
*.bat *.cmd *.ps1 eol=crlf  Windows 入口
*.sh eol=lf                 再强调一遍 Unix 脚本
图片/字体/压缩包            binary，禁止换行转换
```

同目录的 `pi-test.sh`（LF）和 `pi-test.bat`（CRLF）被两套规则覆盖。macOS 上 `read_file` 看到的 `.bat` 仍可能显示为单行或带 `^M`，那是 CRLF 的正常表现。

## 文件做什么

### `* text=auto eol=lf`

`text=auto`：git 猜文件是不是文本。`eol=lf`：工作区也用 LF（在 core.autocrlf 未强行干预时）。Linux / macOS 开发者和 CI  runner 都是 LF。若有人在 Windows 开了 `core.autocrlf=true`，属性和全局配置会博弈，结果以属性和 git 版本为准——所以才把关键扩展名写死，而不是相信 auto。

### Windows 脚本强制 CRLF

cmd.exe 解析 `.bat` 时对 `\n` 单独换行的支持差。PowerShell 对 `.ps1` 更宽容，但 GitHub 上「Windows 用户双击 pi-test.bat」这条路径要求 CRLF。`pi-test.bat` 本身只是跳到 `pi-test.ps1` 的薄包装，两份都钉 CRLF。

### `*.sh` 强制 LF

即使 Windows 克隆，bash（Git Bash / WSL）看到的 `test.sh` / `pi-test.sh` 仍是 LF。否则 shebang 变成 `#!/usr/bin/env bash\r`，报 `bad interpreter`。这是经典坑，本文件专门堵。

### binary

png/jpg/gif/webp/ico/pdf/zip/gz/woff：禁止 git 做换行转换，否则图片损坏。TUI 的 native prebuild `.node` 没写在这里——它们通常已被 git 当二进制检测，且路径在 `packages/tui/native/**/prebuilds/`。源码 archive 脚本会检查这些 `.node` 是否在包内。

## 关键逻辑

失败会怎样：

- 有人用「Normalize line endings」把 `.bat` 转成 LF 并提交 → Windows 用户跑 `pi-test.bat` 失败，而 macOS CI 全绿
- 反过来 `.sh` 被存成 CRLF → Linux CI 的 `./test.sh` shebang 失败，Windows 开发者可能毫无感觉
- 把 `.gitattributes` 删了只靠 `core.autocrlf` → 每个开发者本机 git 配置不同，lockfile 和脚本会来回抖 EOL，diff 噪声巨大

`check` 和 biome **不管** shell/bat 换行。这是 git 层的门，不是 lint 门。

## 和启动链的关系

间接：Windows 课表入口是 `pi-test.bat` → `pi-test.ps1` → tsx `cli.ts`。没有正确 CRLF，这条链第一跳就进不去。Unix 课表入口 `pi-test.sh` 依赖 LF。

## 下一课

隔离环境下的测试入口：[14-test.sh.md](/series/pi-source/root/018-test-sh/)。
