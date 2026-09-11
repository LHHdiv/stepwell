---
title: "17 · pi-test.bat — cmd.exe 跳到 PowerShell"
summary: "认清它是 12 行转发器：找到 powershell.exe，用 Bypass 执行策略跑旁边的 pi-test.ps1，把 % 原样递过去。真正的 --no-env 和 tsx 调用在 ps1 里。EOL 必须是 CRLF，见 .gi"
tags: [pi, root]
---
源码：`pi-test.bat`  
被谁调用：在 cmd.exe 或资源管理器里双击/键入 `pi-test.bat` 的 Windows 开发者。Git Bash 用户应直接跑 `pi-test.sh`。本文件自身几乎不做产品逻辑。

## 本课目标

认清它是 **12 行转发器**：找到 `powershell.exe`，用 Bypass 执行策略跑旁边的 `pi-test.ps1`，把 `%*` 原样递过去。真正的 `--no-env` 和 tsx 调用在 ps1 里。EOL 必须是 CRLF，见 [.gitattributes](/series/pi-source/root/017--gitattributes/)。

## 在仓库中的位置

```text
pi-test.bat          cmd
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File pi-test.ps1 %*
    tsx.cmd packages/coding-agent/src/cli.ts     ← 注意：cli.ts，不是 experimental
```

`setlocal` 避免污染调用方的环境变量。`set "SCRIPT_DIR=%~dp0"` 带反斜杠结尾的脚本目录，和 sh 版 `SCRIPT_DIR` 同角色。

## 文件做什么

1. `where powershell.exe`：没有就向 stderr 打印安装提示，`exit /b 1`。`/b` 表示不关掉外层 cmd。
2. `-NoProfile`：不跑用户的 `Microsoft.PowerShell_profile.ps1`，避免有人在 profile 里 alias `node` 或改 `PATH` 导致本机才能复现的启动故障。
3. `-ExecutionPolicy Bypass`：即使机器策略禁止未签名脚本，这一次仍能跑仓库里的 ps1。不修改用户永久策略。
4. `exit /b %ERRORLEVEL%` 把 powershell 的退出码传回。

`%*` 在 bat 里对含空格参数的处理有历史坑。复杂参数应直接调 `pi-test.ps1`。本 bat 的存在价值是：习惯 `foo.bat` 的人和某些 Windows 工具只认 bat。

## 关键逻辑

失败会怎样：

- 系统只有 PowerShell 7（`pwsh`）没有 Windows PowerShell 5 的 `powershell.exe`：`where` 失败。现代 Windows 通常两者都在；精简容器可能没有
- ExecutionPolicy 被组策略锁死到 AllSigned 且 Bypass 被禁：启动失败，需要 IT 放行或改用 Git Bash + `pi-test.sh`
- 文件被存成 LF：cmd 可能把标签和命令粘在一起。gitattributes 是防护，review 时若看到 bat 的巨大一行 diff，先查 EOL

## 和启动链的关系

Windows 上的源码入口第一跳。第二跳是 ps1，第三跳已经进 `cli.ts`（发布入口），**跳过了 experimental/cli.ts**。在 Windows 上按课表 01 读 experimental，实际进程没加载它，除非你手动 `tsx experimental/cli.ts`。

## 下一课

真正干活的 Windows 脚本：[18-pi-test.ps1.md](/series/pi-source/root/022-pi-test-ps1/)。
