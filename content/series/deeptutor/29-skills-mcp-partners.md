---
title: 第29讲·技能、外接工具、IM 伴侣不是同一个词
summary: 技能是按需翻的讲义卡片；MCP 是外校实验室的仪器；Partner 是把同一位老师接到聊天软件。
objectives:
  - 能用自己的话区分 skill、MCP、partner
  - 知道技能默认不整本塞进系统提示
  - 明白伴侣复用聊天循环，不是另一套大脑
tags: [deeptutor, 技能, MCP, 伴侣]
keyPoints:
  - Skill：SKILL.md 手册，read_skill 按需读取
  - MCP：外接服务器工具，适配成 BaseTool
  - Partner：IM 通道 + 独立工作区，跑聊天能力
---

三个英文词常被一口气说完：skills、MCP、partners。它们都「让家教更能干」，可放进仓库的抽屉完全不同。混用之后，你会去错误的目录找「为什么 Telegram 里的机器人不会用我的 PDF 技巧」。

## 技能：书架上的专题小册

一句话定义：**技能（skill）**是一份带说明书的能力小包——主要是 `SKILL.md`，可选参考资料与脚本约定。为什么需要它？因为系统提示装不下整本「如何处理 PDF」；更好的办法是目录里一行简介，用到时再翻全文。

加载与规则写在 `deeptutor/services/skill/service.py`：内置技能在 `deeptutor/skills/builtin/`，用户技能在工作区 `skills/`；同名时用户覆盖内置。提示里通常只有清单；模型通过 `read_skill` 拉正文。例外是 frontmatter 里 `always: true` 的家规，会主动注入。

还可以写 `requires`：缺某个命令、缺环境变量、或缺沙箱时，清单里标成不可用，避免模型假装会跑。人格口吻（老师腔、同伴腔）**不是**技能——它们在 `deeptutor/services/persona/`，选中后从第一句就要生效，所以整段注入系统提示。

> 小结：技能是按需翻的专题卡；口音预设是一开课就戴上的麦克风。

## MCP：外校实验室借仪器

一句话定义：**MCP（Model Context Protocol，模型上下文协议）**是一种把外部工具服务器接进模型世界的开放约定。为什么 DeepTutor 要管它？因为你可能已有公司内部检索、浏览器自动化等服务，不想为每个都手写 `BaseTool`。

`deeptutor/services/mcp/manager.py` 维护连接：每个服务器有独立连接任务，工具被适配成聊天可用的 `BaseTool`，并同步进工具注册表。许多 MCP 工具标成 **deferred（延迟披露）**：不全塞进首轮工具清单，而走 `load_tools` 渐进加载，免得菜单比问题还长。连接按所有者分钥匙，避免多账户抢同一条会话。

配置与密钥有单独存放约定；内置还可注入如 PageIndex 一类服务器。对模型来说，用起来「像工具」；对运维来说，生命周期像「外部进程的插座」。

> 小结：MCP 是借来的仪器，插座归管家，说明书要翻成工具名片。

## 伴侣：同一位老师，换到聊天软件教室

一句话定义：**Partner（伴侣 / IM 伴侣）**是挂在即时通讯渠道上的学习同伴：Telegram、飞书等通道进来的消息，仍走向 DeepTutor 的聊天智能体循环。为什么单独成包？因为要管通道登录、出站路由、每个伴侣一份隔离工作区（`data/partners/<id>/`），还要有自己的人设文稿（soul）。

`deeptutor/partners/` 注释写得很直白：通道与总线在这边；运行时在 `deeptutor/services/partners/`，复用 `ChatOrchestrator` → 聊天能力管线——**没有第二套伴侣专用大脑**。CLI 有 `deeptutor partner list` 等管理命令。伴侣也可以带技能与记忆工具，但那是「这位同伴的工作区配置」，不是 MCP，也不是把 SKILL.md 改名成 partner。

| 名词 | 像什么 | 关键目录 / 模块 |
| --- | --- | --- |
| Skill | 专题讲义卡 | `services/skill/`，`skills/builtin/` |
| MCP | 外接仪器 | `services/mcp/` |
| Partner | IM 教室门卫 + 工位 | `partners/`，`services/partners/` |
| Persona | 固定口音 | `services/persona/` |

> 小结：三个词叠在「变强」上，分叉在「装哪里、何时注入、谁拥有状态」。

## 试一试

打开任意一个内置技能的 `SKILL.md`（例如 `deeptutor/skills/builtin/pdf/SKILL.md`）看 frontmatter 的 `requires`。再打开 `deeptutor/partners/__init__.py` 的模块说明，找有没有「复用 chat agent loop」这句话。最后在 `services/mcp/manager.py` 文件头扫一眼 deferred 的动机。三份注释对照，比背名词表快。

## 下一讲预告

下一讲看三门「大课」产品：活书、引导学习、一起改稿——它们和默认聊天课怎么排座位。
