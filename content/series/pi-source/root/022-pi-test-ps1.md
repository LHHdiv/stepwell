---
title: "18 · pi-test.ps1 — Windows 源码入口（走 cli.ts）"
summary: "对照 sh 版，抓住三处分叉：入口文件是 src/cli.ts、tsx 二进制是 tsx.cmd、找不到 tsx 会 throw 而不是让 bash 报 No such file。--no-env 的名单必须和 sh 版保持同步。"
tags: [pi, root]
---
源码：`pi-test.ps1`  
被谁调用：`pi-test.bat`，或在 PowerShell 里直接 `.\pi-test.ps1`。对应 Unix 的 `pi-test.sh`，**但加载的 TypeScript 入口不同。**

## 本课目标

对照 sh 版，抓住三处分叉：入口文件是 `src/cli.ts`、tsx 二进制是 `tsx.cmd`、找不到 tsx 会 throw 而不是让 bash 报 No such file。`--no-env` 的名单必须和 sh 版保持同步。

## 在仓库中的位置

```text
pi-test.ps1
  可选：Remove-Item Env:ANTHROPIC_API_KEY ...
  & node_modules/.bin/tsx.cmd packages/coding-agent/src/cli.ts @forwardArgs
    setupCli(); debugger; main(args)          → coding-agent 02 课
```

`$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path` 得到仓库根，不依赖当前目录。`$ErrorActionPreference = "Stop"`：任何原生命令错误都变终止，接近 `set -e`。

## 文件做什么

### `--no-env`

用 `List[string]` 收集转发参数，遇到 `--no-env` 只置位不转发。unset 通过 `Remove-Item Env:NAME -ErrorAction SilentlyContinue`——变量不存在不算错。名单与 `pi-test.sh` 同构，含 Copilot / AWS / Azure / Google ADC。漏加新厂家时，Windows 开发者会和 macOS 开发者测出不同的「未登录」行为。

### 启动 tsx.cmd

Windows 上 npm bin 是 `tsx.cmd` 而不是 `tsx`。`Test-Path -LiteralPath` 失败就 throw，提示先在仓库根 `npm install`。不要改成 `npx tsx`：npx 可能再下载一份。

`& $tsxBin $cliPath @forwardArgs` 调用后读 `$LASTEXITCODE`，非零则 `exit $exitCode`。PowerShell 函数成功结束默认退出码 0，不显式转发的话，CI 会把失败的 pi 当成成功。

没有传 `--tsconfig`。tsx 在 Windows 上会从入口文件向上找 tsconfig；`packages/coding-agent/` 有 `tsconfig.build.json` 和 `tsconfig.examples.json`，**不一定**捡到根 `tsconfig.json`。这是和 sh 版的潜在行为差：Unix 强制根配置（带 src paths），Windows 依赖 tsx 的查找算法。若 Windows 上出现「改了 ai 包源码没生效」，先怀疑解析到了 dist。

## 关键逻辑

入口选 `cli.ts` 而不是 `experimental/cli.ts`，意味着：

- 没有 `runExperimentalCommand` 那条分叉
- 有 `debugger;` 语句，普通跑会被 V8 忽略，attach inspect 时会停
- `main(...)` 没有 await（cli.ts 里是 fire-and-forget）。未处理的 rejection 行为与 experimental 的 `await main` 不同

这不是文档笔误级差异，是两套启动器的真实分叉。培训在 macOS 上跟课表走 experimental；给 Windows 同事复现 bug 时要用 `cli.ts` 路径想一遍。

失败会怎样：

- 执行策略拦住：用 bat 的 Bypass，或 `Set-ExecutionPolicy -Scope Process Bypass`
- `tsx.cmd` 不存在：throw，不会静默用到全局 `tsx`
- `$LASTEXITCODE` 在某些 PowerShell 主机里不可靠：若发现失败仍返回 0，改成 `exit $LASTEXITCODE` 前后对照 native 命令

## 和启动链的关系

Windows 产品源码链的第一跳。汇合点仍是 `setup.ts` + `main.ts`。和 Unix 的差别只在进入 main **之前**的那一层。

## 下一课

根目录最后一份工程文件是设计移交，不是启动器：[19-tui-plan.md.md](/series/pi-source/root/023-tui-plan-md/)。
