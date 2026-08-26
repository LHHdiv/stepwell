---
title: 第31讲·多位学生同时上课为什么不会串台
summary: 用当前用户上下文和分目录工作区隔离笔记与密钥；授权决定谁能进哪间教室。
objectives:
  - 能说出 data/user 与 data/users/<id> 的分工
  - 知道请求里如何挂上 CurrentUser
  - 明白串台往往是路径或授权漏了，不是模型「记性太好」
tags: [deeptutor, 多用户, 隔离]
keyPoints:
  - ContextVar 保存当前用户，默认本地管理员
  - 每用户一棵工作区树，系统目录不进沙箱
  - 工具 / 模型 / 知识库等可按授权收紧
---

机房里两位同学并排开机：若共用一个「我的文档」文件夹，A 的讲义会进 B 的检索，A 的 API Key 也可能被 B 的进程读到。DeepTutor 的多用户层要做的，就是让每位学生有自己的课桌，老师（管理员）另有总务室——即使他们连的是同一台服务器。

## 先认出「现在是谁」

一句话定义：**CurrentUser（当前用户）**是这次请求认定的身份：id、用户名、角色、工作区范围。为什么需要它？因为后面所有「读笔记、写记忆、选密钥」都要知道课桌在哪。

`deeptutor/multi_user/context.py` 用 `ContextVar` 保存当前用户：`set_current_user` / `get_current_user`；没有设置时退回本地管理员，方便单机自用。WebSocket 在 `unified_ws.py` 里鉴权成功后才会进入业务，并在结束时复位，避免异步任务把上一位同学的身份带走。

身份簿与口令哈希等落在系统区（见 `identity.py`、`data/system` 约定）。多进程 / 多 worker 部署时，文件锁罩不全的竞态，源码注释会提醒你改用外部用户存储——本课只要求你知道：**单机默认路径 ≠ 大规模部署的全部故事**。

> 小结：每堂课先在门卫处别好校牌，再进教室。

## 课桌分开：目录就是围墙

一句话定义：**工作区范围（scope）**决定 PathService 根落在哪。`deeptutor/multi_user/paths.py` 写得很清楚：

- `data/user`：管理员工作区（管理范围的根在 `data/`）
- `data/users/<uid>`：普通学生每人一棵树
- `data/partners/<id>`：伴侣的合成用户工位
- `data/system`：账户、授权、审计、密钥一类总务——**不要挂进沙箱 runner**

共写历史、技能、记忆、会话等，应通过 `get_path_service()` 解析，这样换用户自然换根目录。若有人写死 `data/user/...`，多用户一开就串台——这是排查「他怎么看见我的笔记」时优先睁大眼睛的地方。

伴侣与 MCP 连接也按所有者分钥匙（前几讲提过），同一道理：状态带主人名，才能同进程多租户。

> 小结：隔离首先是路径与所有权，不是靠模型「自觉不偷看」。

## 授权：能进门，和能用哪些教具

即使坐对了课桌，也可以规定：普通学生不能 exec、不能用某模型、不能挂某知识库。`multi_user/` 下有 `tool_access`、`model_access`、`knowledge_access`、`skill_access`、`partner_access` 等模块，把「教具柜」按人上锁。沙箱那一讲的账户级 exec 开关，就是这条链上的一环。

对学生体验，「串台」常见三种声音：

1. 看见别人的会话或文件 → 查路径与 scope。
2. 能用本不该有的工具 → 查授权。
3. 跑代码碰到系统密钥 → 查挂载与 `data/system` 边界。

> 小结：校牌决定课桌；授权决定教具；沙箱决定双手伸多远。

## 试一试

打开 `deeptutor/multi_user/paths.py` 顶部文档注释，把四类目录抄到纸上。再打开 `context.py`，看 `get_current_user` 在空上下文时返回谁。最后在仓库里搜索一处 `get_path_service().get_co_writer_dir` 或类似调用，确认共写没有写死管理员路径。

## 下一讲预告

下一卷开工：对照 BrainstormTool，一步步加一颗小按钮（工具）。
