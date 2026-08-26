---
title: 第26讲·运行代码为什么要关在沙箱里
summary: 模型写的代码不可全信；沙箱是唯一入口，宁可不跑也不裸跑，并按部署选隔离强度。
objectives:
  - 能说出沙箱要防的三类坏事
  - 分清 SYSTEM / APPLICATION / OFF 三档隔离
  - 知道工具应经 SandboxService，而不是直接开子进程
tags: [deeptutor, 沙箱, 安全]
keyPoints:
  - SandboxService 是跑命令的唯一门卫
  - 健康检查失败等于 OFF，拒绝执行
  - Docker runner、bwrap、受限子进程三种后端按环境挑选
---

辅导里常有一步：「我写段 Python 验一下这道题。」听起来很勤快，可这段代码出自模型（或学生粘贴），你不知道它会不会去翻钥匙、删文件、拿服务器当跳板。DeepTutor 的规矩是：要跑，就请进 **沙箱（sandbox）**——专门腾出来的工具间，不是把客厅钥匙整串递出去。

## 不隔离会怎样，以及唯一入口

一句话定义：**沙箱**是限制权限的隔离执行环境，让不可信代码能干正事，却尽量碰不到主机上的贵重物。为什么需要它？因为「会自己写代码并执行」的系统，若直接在主机跑，风险与辅导能力成正比。

所有想跑命令的路径，应问 `SandboxService`（`deeptutor/services/sandbox/service.py`），不要自己 `subprocess`。一次 `run` 大致会：

1. 健康检查：后端活着吗？
2. 账户级执行开关：这个人允不允许 exec？
3. 配额：同时几个、每分钟几次？
4. 交给具体 backend 执行。

后端不健康时，`isolation_level()` 变成 `OFF`，`available()` 为假——**宁可不让跑，也不裸跑**。技能清单里若写了「需要 sandbox」，也会用 `exec_capability_available` 判断：根本没配后端，就不要假装有「跑脚本」这门课。

默认还有资源天花板（超时、内存量级、输出字数等），写在 `deeptutor/services/sandbox/spec.py` 的 `ResourceLimits`；超时会杀进程，避免一道题把教室卡死。

> 小结：跑代码只有一扇门；门卫说关，就关。

## 三档隔离，三种常见落地

一句话定义：**隔离级别（IsolationLevel）**描述「墙有多厚」。源码三档：

| 级别 | 人话 | 谁通常能用 shell |
| --- | --- | --- |
| `SYSTEM` | 操作系统级隔离（容器 / 命名空间） | 普通用户可开 exec |
| `APPLICATION` | 主要靠程序内路径与环境管束 | 管理员自愿开启的本地开发 |
| `OFF` | 没有可用沙箱 | 不跑不可信代码 |

`deeptutor/services/sandbox/config.py` 的 `build_backend` 按部署挑选后端（`backends.py`）：

- 设了 runner 地址 → **Runner 边车容器**（Docker 部署常见）：主应用自己不跑不可信 shell。
- Linux 且有 `bwrap` → **bubblewrap 命名空间**：只读挂系统目录、临时 `/tmp` 等。
- 显式允许子进程 → **受限子进程**：清危险环境变量，隔离最弱，偏本地开发。
- 都不满足 → 无后端，exec 关掉。

请求本身有两种写法：`command` 字符串，和更安全的 `argv` 向量。有 `argv` 时尽量不经 shell，减少「模型输出里夹带 `; rm …`」这类经典事故。两种写法必须描述同一件事，免得新旧 runner 滚动升级时跑成两套命令——`ExecRequest` 的注释把这件事写得很清楚。

> 小结：墙的厚度跟部署走；弱隔离不能假装成强隔离。

## 和学生体验的关系

学生看见的往往只是「正在运行代码…」或「当前环境不能执行」。背后可能是：没配沙箱、配额用尽、账户禁用了 exec、或命令超时。工具层（如 `exec`、`code_execution`）应把沙箱结果翻译成人话，而不是把主机报错原文甩到气泡里吓人。

产物（图画、生成文件）另有回收路径，仍要假定「沙箱里写出来的东西」才可信，不要让模型指定任意主机路径当输出目录。系统机密目录（如 `data/system`）约定不挂进 runner——多用户那一讲还会再碰到这条边界。

> 小结：学生听到的失败原因，应是「这间工具房暂时不可用」，不是「请 ssh 进服务器」。

## 试一试

打开 `deeptutor/services/sandbox/config.py`，顺着 `build_backend` 把四种结果（runner / bwrap / subprocess / None）画成一张决策树。再看一眼本机：若是 macOS 本地开发，默认常常没有 SYSTEM 级后端——对照注释想一想，为什么要额外开关才允许受限子进程。

## 下一讲预告

下一讲回到大门：命令行、网页、Python 调用，为什么说是同一位老师的三扇门。
