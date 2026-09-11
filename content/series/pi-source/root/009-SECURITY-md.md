---
title: "05 · SECURITY.md — 本地 agent 的信任边界"
summary: "能用本文的语言拒绝假漏洞，也能判断真漏洞该私报到哪。核心句：Pi 跑在启动它的那个用户的安全边界里，故意没有沙箱。这和 README 的 Permissions 节、coding-agent 的 containerization 文档是"
tags: [pi, root]
---
源码：`SECURITY.md`  
被谁调用：安全研究员、GitHub Private Advisory、想报「模型让我删了文件」的用户。**运行时不读。** 产品行为由代码决定；这份文件决定**什么算漏洞**。

## 本课目标

能用本文的语言拒绝假漏洞，也能判断真漏洞该私报到哪。核心句：Pi 跑在启动它的那个用户的安全边界里，**故意没有沙箱**。这和 README 的 Permissions 节、coding-agent 的 containerization 文档是同一模型的三份拷贝。

## 在仓库中的位置

```text
SECURITY.md                    政策
README.md Permissions          产品说明
packages/coding-agent/docs/containerization.md  若要隔离该怎么做
packages/coding-agent 的 bash/read/write/edit 工具   实际能力（用户权限）
```

报告通道：`security@earendil.com` 或 GitHub Security Advisories。禁止用公开 issue 报敏感洞。

## 文件做什么

### 信任模型（先读这段，再看 Scope）

1. 本地用户账户、以及该账户能写的文件，和 Pi 进程在同一信任域。
2. 攻击者如果已经能改 `~/.pi`、workspace、shell rc、环境变量、Pi 配置，他已经赢了；再展示「于是 Pi 执行了恶意命令」不算突破 Pi 的边界。
3. 例外：报告必须证明 **是 Pi 自己把写权限递出去的**，或跨越了 OS 权限边界（比如从普通用户打到 root、从容器打到宿主机）。
4. 扩展、skill、`AGENTS.md`、仓库内注释都可以 prompt inject。产品选择「只在受信任的仓库里用、只装受信任的扩展」，而不是在模型层做无法完成的注入防护。

### 范围内

发行的包、CLI、API、仓库代码、以及 Earendil 运营的 `pi.dev` 基础设施。依赖漏洞必须证明：**发运的依赖受影响，并且通过 Pi 的调用路径可达。** 泄露的密钥必须是 Earendil 的，或能进 Earendil 的基础设施。

### 明确不在范围（报了会被关）

- 本地代码执行 / 没有沙箱（故意的）
- 用户自己装的扩展和 skill
- 在不信任的仓库里工作
- 装不信任的包
- 不信任的 MITM 代理
- 把 Pi 暴露到公网
- Prompt injection
- 第三方/用户自己的密钥泄露
- 需要先能改本地文件（含 `~/.pi`、`models.json`、AGENTS.md、NFS/dotfile 同步）才能成立的报告
- 用户故意削弱的配置
- 用受信本地输入把 coding-agent 打成 DoS
- 「模型输出是恶意的」
- 用户点过同意或用户发起的本地动作

文中举的反例非常具体：往受信配置文件里写恶意内容，导致 Pi 执行命令、加载攻击者工具、把凭证发到攻击者 URL——**仍算出范围**，因为写配置文件已经在信任域内。

## 关键逻辑

这份政策让安全研究的目标从「让模型干坏事」（太容易，且是产品功能）变成「Pi 是否在不该跨越的边界上跨越了」。例如：

- 真洞方向：解析协议时的路径穿越写出了 workspace 之外且用户原本写不了的位置；安装器以 root 跑时跟着不可信输入走；npm 包里带了能在 `--ignore-scripts` 之外执行的预编译恶意代码；`pi.dev` 上的目录服务未授权改 latest 指针。
- 假洞：`bash` 工具执行了 `curl | sh`；恶意 `AGENTS.md` 让 agent 泄露 key；扩展 hook 改了 `Authorization` 头。

失败会怎样：

- 研究员按普通 CWE 报「命令注入」→ 被标 out of scope，关系变差，真洞也不想来
- 真洞开了公开 issue → 在补丁之前被利用；本文要求 private advisory 就是为了挡这个
- 工程上若有人给 bash 工具加「确认提示」当沙箱 → 和本文冲突，也和核心最小哲学冲突；隔离应该发生在 OS/VM 层（Gondolin 等）

## 和启动链的关系

不进启动链。但启动之后默认工具就是完整的用户权限：`createBashTool(cwd)` 没有 seccomp。课表读到 `core/tools/bash.ts` 时，用本文当背景：没有 permission prompt 不是漏了，是模型。

`./test.sh` 隔离 HOME 是为了测试可复现、不碰真凭证，**不是**安全沙箱。测过绿不代表用户机器安全。

## 下一课

法律包装：[06-LICENSE.md](/series/pi-source/root/010-LICENSE/)。
