---
title: "98 · resolve-config-value.ts — models.json 里的 `$ENV` 和 `!cmd`"
summary: "以 ! 开头：当 shell 命令，stdout trim，缓存。Windows 先试 settings 的 shell，失败再 execSync。超时 10s，stderr 丢弃。非 0 当 undefined。"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/core/resolve-config-value.ts`  
被谁调用：组 Provider 的 apiKey/headers；AuthStorage 展开存盘的 command key。

以 `!` 开头：当 shell 命令，stdout trim，**缓存**。Windows 先试 settings 的 shell，失败再 `execSync`。超时 10s，stderr 丢弃。非 0 当 undefined。

否则当模板：`$VAR` / `${VAR}`，`$$`/`$!` 转义。缺环境变量 → 值未配置（`getMissingConfigValueEnvVarNames`）。

`resolveHeaders` 对对象每个 value 同样规则。`clearConfigValueCache` 给 `/reload` 和扩展。

这是启动/请求路径上的代码执行点：models.json 里的 `!op read …` 会跑本地命令。文件权限 0600 仍重要。

## 下一课

[99-session-cwd.ts.md](/series/pi-source/coding-agent/652-session-cwd-ts/)。
