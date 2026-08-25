---
title: 第19讲·内置工具巡礼：几十个工具的家族图谱
summary: 按"文件、执行、终端、web、协作、元管理"六族盘点 dsh 的内置工具与代表包。
objectives:
  - 说出六大工具族各自的代表工具与所属包
  - 理解 str-replace-editor 这类"精准编辑"工具的设计取舍
  - 建立"给智能体选工具箱"的评价框架
tags: [deepseek-harness, 内置工具, 巡礼]
keyPoints:
  - 文件族：tool-fs / tool-fs-search / tool-str-replace-editor，配合 fs 家族的意图门控
  - 执行族：bash/pwsh 各有 local 与 sandbox 双后端；终端族提供 6 个 PTY 工具
  - web 族：三家搜索引擎适配 + HTTP 抓取，同一接缝多家实现
  - 元管理族：todo、job_*、subagent 工具让模型管理自己的工作方式
---

上一讲读了 defineTool 契约，本讲看作品——dsh 自带的工具全家桶。不逐个拆源码（那是查字典式的学习），而是按**功能族群**建立地图，挑每个族最有代表性的设计讲透。以后你写自己的工具，每族都有现成的范本可抄。

## 一、文件族：读、搜、改三件套

`packages/fs/` 家族贡献了最常用的三个工具包：

- **tool-fs**：文件读写的基础操作。它的特殊之处在于和 `fs/` 能力事件的深度绑定——每次写入前会触发 `fs/write-intent` 意图门控（第 20 讲流水线里的 fsGate 节点），策略插件因此能实施"只许动 workspace 内的文件"这类规则。而且它会在结果里附带上下文 diff（第 06 讲提过的 tool/result.meta 字段就是它带火的）；
- **tool-fs-search**：文件内容搜索（glob/grep 类语义），让模型自己找线索而不需要你告诉它文件在哪；
- **tool-str-replace-editor**：精准字符串替换编辑器。为什么不用"整文件重写"？因为精确替换天然防误伤：oldText 匹配不到就报错，而不是把文件搅成面；匹配到多处也拒绝（要求扩大上下文锚定唯一位置）。这个设计哲学叫 **edit-with-verification**——宁可多一轮调用，不可静默破坏。所有做 AI 编程工具的人都该抄这份作业。

## 二、执行族：bash 与 pwsh 的双平台四后端

`packages/shell/` 的结构一眼看穿：

```text
shell/
├── bash-local      # 本地 bash 后端
├── bash-sandbox    # 沙箱 bash 后端（包装 ['bash','-c',command]）
├── pwsh-local      # 本地 PowerShell 后端（Windows）
└── pwsh-sandbox    # 沙箱 PowerShell 后端
```

同一能力、两个平台、每种平台再分裸奔与沙箱两种提供方——这就是第 03 讲"换一个 Provider 改变整个产品形态"的具象化。消费侧注册到 `ctx.shell`，底层孵化进程靠 `ctx.subprocess`。第 21 讲我们进沙箱内部看 argv 包装术。

## 三、终端族：持久 PTY 六件套

bash 工具是"一锤子买卖"——每次调用一个独立进程，跑完即走。但有些工作需要**跨调用的状态**：启动开发服务器、进入交互式程序、保持虚拟环境激活。`packages/terminal/` 提供持久 PTY（伪终端）会话：

| 包 | 职责 |
|---|---|
| `pty`(terminal) | 会话注册表（ctx.terminals）：品牌化 id、精确的 Agent 所有权、清理 |
| `terminal-bash` | 在 subprocess 之上的 shell 后端：就绪检测、有界状态 |
| `tool-terminal` | 6 个面向模型的工具 + 后台发送集成 |

值得咀嚼的是"有界读取"（bounded terminal state）设计——终端输出是无限流，工具只保留最近的有界窗口，防止一个跑了三小时的 dev server 把历史撑爆。这是 spill 思想（第 16 讲）在时间维度上的近亲。

## 四、web 族：一个接缝，三家引擎

```text
packages/web/
├── web-search-deepseek / web-search-exa / web-search-perplexity   # 三家搜索
├── web-fetch-http      # HTTP 抓取
└── tool-web            # 面向模型的统一工具
```

三个搜索引擎适配器实现同一个接缝，tool-web 作为消费方对模型暴露统一入口。想加第五家引擎？写个新 Provider 注册上去，模型连名字都不用知道变了。这是检验你有没有真懂"能力 seam"的试金石题。

## 五、协作族与元管理族

**subagent 工具**（卷六细讲）：`tool-subagent` / `tool-subagent-control` / `tool-subagent-report` 三件套让模型能派出子任务、控制其生命周期、收取报告。

**jobs 元管理**：`job_*` 工具对应 ctx.jobs 上注册的后台工作——模型可以列出、收集结果、停止后台任务。注意这个递归的美感：**模型用工具来管理自己的异步工作**。

**todo/write**：待办清单全量快照（第 06 讲精读过它的类型）。log-only 事件，UI 实时渲染成任务面板——模型借此向用户展示"我打算怎么干"，是透明度的直接来源。

## 六、选型框架：给你的智能体配工具箱

巡礼完毕，沉淀一个评价框架。给智能体配工具时问五个问题：

1. **覆盖度**：模型的常见意图都有对应工具吗？（缺了它就会瞎编 shell 命令硬凑）
2. **精度梯度**：粗粒度和细粒度版本都有吗？（fs 全量读写 vs str-replace 精准替换）
3. **安全性分层**：危险操作有没有对应的沙箱/审批路径？
4. **描述质量**：description 是否说清了"何时该用我、何时不该"？
5. **结果体积**：大输出的工具是否接了 spill/截断策略？

官方仓库的 `docs/tool-catalog.zh.md` 是全部工具的权威目录（脚本从源码生成），建议收藏当字典查。

> 💡 **知识拓展：工具设计的"最小惊讶原则"**
> 观察官方工具的共同气质：名字直白（read/edit/search）、行为可预测（失败就报错不猜）、边界清晰（不做分外之事）。反例是把十种功能塞进一个大而全的工具——模型选择准确率骤降，参数组合爆炸难测。**一个工具一件事，像 Unix**；这条 1970 年代的老律，在 LLM 工具设计时代反而更致命了——因为你的"用户"会用概率而非逻辑去调用它们。

## 试一试

打开 `docs/tool-catalog.zh.md`，数一数内置工具总数，并找出本讲没提到的一个工具，用 defineTool 契约的语言描述它：schema 里写了什么承诺？execute 大概要观察哪些信号？

## 下一讲预告

工具有了，真正的高潮是一次调用的完整旅程：从 tool/call 落账到 UI 卡片、经过权限瀑布与审批关卡、进入 execute、再到结果的规范化与最终落账。下一讲沿着官方流水线图走完全程。
