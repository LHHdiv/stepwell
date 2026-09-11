---
title: "102 · utils/shell.ts — bash/pwsh 定位与杀进程树"
summary: "getShellConfig(customPath?)：用户路径 → Windows Git Bash 常见位置 → PATH 上的 bash → Unix /bin/bash → sh。老 WSL C:\\Windows\\System3"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/utils/shell.ts`

`getShellConfig(customPath?)`：用户路径 → Windows Git Bash 常见位置 → PATH 上的 bash → Unix `/bin/bash` → `sh`。老 WSL `C:\Windows\System32\bash.exe` 用 stdin 传命令（`-s`），不是 `-c`。

`getPowerShellConfig`：`pwsh` 或 `powershell` + `-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command`。

`getShellEnv`：把 `getBinDir()` .prepend 进 PATH，让 bash 里能直接跑托管的 `fd`/`rg`。

`sanitizeBinaryOutput`：剥掉 NUL 等，避免 TUI 被二进制弄乱。

`trackDetachedChildPid` / `killTrackedDetachedChildren`：bash 工具 `nohup` 出的孙子。print/rpc/interactive 退出时都要杀，否则用户以为 Ctrl+C 停了。`killProcessTree` 平台相关。

## 下一课

[103-utils.clipboard.ts.md](/series/pi-source/coding-agent/661-utils-clipboard-ts/)
