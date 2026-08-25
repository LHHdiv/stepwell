---
title: 第02讲·跑起来：三种启动方式与配置体系
summary: 源码运行、纯后端、Docker 三条路；以及 data/user/settings/ 下的配置文件地图。
objectives:
  - 用至少一种方式把 DeepTutor 跑起来
  - 认识 settings 目录的 12 个配置文件
  - 理解"改配置要 restart"的原因
tags: [deeptutor, 动手, 环境]
keyPoints:
  - 源码开发：pip install -e ".[dev]" → python scripts/start_web.py --dev
  - 配置在 data/user/settings/（12 个文件），不在环境变量里
  - compose.yaml 用只读容器 + supervisord 同时管 FastAPI 和 Next.js
---

## 三条启动路线

**路线一：源码开发（学习推荐）**

```bash
cd Project/DeepTutor
pip install -e ".[dev]"
# 配置模型：编辑 data/user/settings/model_catalog.json（或在网页 Settings 里配）
python scripts/start_web.py --dev
```

`start_web.py` 是个兼容壳，真正干活的是 `deeptutor/runtime/launcher.py`：拉起 uvicorn（后端 :8001）和 Next.js dev server（前端 :3782），并做端口探测与就绪等待。

**路线二：纯后端**——`deeptutor serve --port 8001`，配合 API/SDK 使用，不起前端。

**路线三：Docker**——`podman compose -f compose.yaml up -d`。这个 compose 文件值得读注释（注释即文档）：只读容器（`read_only: true`）+ tmpfs 白名单可写区 + supervisord 在**同一个容器**里管 FastAPI 和 Next.js 两个进程；唯一业务卷是 `./data`；端口只绑 127.0.0.1。

## 配置体系：12 个文件的地图

DeepTutor 的配置哲学：**一切皆文件，集中在 data/user/settings/**：

| 文件 | 管什么 |
|---|---|
| `system.json` | 端口/CORS/附件上限 |
| `model_catalog.json` | 模型档案（用哪些模型） |
| `auth.json` | 认证开关 |
| `integrations.json` | PocketBase 集成 |
| `document_parsing.json` | 文档解析引擎选择 |
| `llamaindex/lightrag/graphrag/pageindex.json` | 各 RAG 引擎参数 |
| `main.yaml` | 记忆等杂项 |
| `agents.yaml` | 智能体配置 |

**改配置的正确姿势：编辑文件 → restart**（compose 注释里特别强调不要试图用环境变量覆盖）。为什么这么"原始"？因为 DeepTutor 把配置文件当作**唯一事实来源**——和 dsh 的日志、pi 的 settings.json 一脉相承：可版本化、可审计、可手工备份。对个人部署来说，这个哲学让"搬个家"变成拷贝一个 data 目录。

## 试一试

用路线一跑起来，打开网页设置页随便改一项设置，然后去 `data/user/settings/` 找到被改动的文件——亲眼确认"网页操作 = 写配置文件"。这个认知会让你后续所有排错事半功倍。

## 下一讲预告

卷二：核心循环。先读两份"合同"——BaseTool 与 BaseCapability（第 10 讲已预热），然后直捣全项目灵魂：标签协议。
