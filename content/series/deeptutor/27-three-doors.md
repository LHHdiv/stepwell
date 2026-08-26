---
title: 第27讲·命令行、网页、程序入口其实是同一位老师
summary: CLI、WebSocket、SDK 都把一轮课打成同一份请求，交给同一套回合运行时与编排器。
objectives:
  - 能指出三扇门各自的「前台」文件
  - 理解 TurnRequest / start_turn 是共用寄存处
  - 知道换入口不该复制第二套聊天循环
tags: [deeptutor, CLI, WebSocket, SDK]
keyPoints:
  - DeepTutorApp 是稳定门面，CLI 主要找它
  - 网页经 /api/v1/ws 开回合、订阅读流
  - ChatOrchestrator 按 UnifiedContext 选能力
---

有人喜欢黑底白字敲命令，有人喜欢浏览器聊天气泡，还有人想在自己的脚本里 `await` 一轮辅导。三种习惯，不该养出三个脾气不同的家教。DeepTutor 的设计是：**三扇门，一位老师**——前台礼仪可以不同，进教室后的课表同一套。

## 先把请求放进同一只书包

一句话定义：**入口（entry point）**是学生怎么走进学校；**门面（facade）**是统一收书包的教务处。为什么需要门面？否则 CLI 一套参数、网页一套 JSON、脚本又一套，能力与会话会悄悄分叉。

Python / CLI 侧的稳定门面是 `DeepTutorApp`（`deeptutor/app/facade.py`）。它把一轮课收成 `TurnRequest`：内容、能力名、会话、工具、知识库、语言、附件、技能等。`start_turn` 解析能力别名后，交给回合运行时真正开课。

命令行包装在 `deeptutor_cli/`：例如聊天与 `deeptutor run …` 会构造 `TurnRequest`，再 `run_turn_and_render`（`deeptutor_cli/common.py`）——先 `start_turn`，再订阅这一轮的事件流，把进度打到终端。笔记本、会话列表等子命令同样拿 `DeepTutorApp`，而不是各自发明存储。

> 小结：先装同一只书包（TurnRequest），再进教室。

## 网页那扇门：对讲机协议

浏览器不能直接 import Python。它连的是统一 WebSocket：`deeptutor/api/routers/unified_ws.py` 挂在 `/api/v1/ws`（完整路径还要加上 API 路由前缀，以服务挂载为准）。客户端消息类型写在文件头注释里，常见的有：

- `message` / `start_turn`：开新回合
- `subscribe_turn` / `resume_from`：订阅读流或断线续上
- `cancel_turn`：叫停
- `submit_user_reply` / `user_input`：回答「请问一下学生」类暂停
- `regenerate`：用上一句学生话再讲一遍

鉴权通过后才 `accept`。开回合同样走进 `get_turn_runtime_manager().start_turn(...)`——和门面背后是同一位教务。事件带序号（`seq`），方便刷新页面后「从第几号接着听」，而不是整堂课重来。

编排器 `ChatOrchestrator`（`deeptutor/runtime/orchestrator.py`）吃的是更早讲过的 `UnifiedContext`：选定能力（默认 `chat`），挂上 `StreamBus`，把过程事件交给订阅者。CLI 渲染器、WebSocket 转发、SDK 流式迭代，都是不同的听众，不是不同的大脑。

> 小结：网页换的是对讲机协议，不是另一位老师。

## 为什么坚持「不要第二套循环」

如果为 CLI 单独写一套「简单问答」，为网页再写一套「带工具的问答」，半年后一定出现：网页会检索讲义，命令行不会；或一边能暂停问学生，另一边会直接下课。仓库的 `AGENTS.md` 开篇就画了三入口汇入编排器的图——本课认这张图。

Book、Learning、部分专用页可能还有自己的 WebSocket 或 HTTP（例如书的进度）。那是**另一门课的教室门铃**，仍应复用流事件与存储约定，而不是复制聊天循环。你改「讲完了怎么判断」时，优先改能力与 agent loop；入口文件只负责翻译与搬运。

> 小结：门铃可以有多扇；黑板只有一块。

## 试一试

对照三处「开一轮」的调用：`deeptutor/app/facade.py` 的 `start_turn`、`deeptutor_cli/common.py` 的 `run_turn_and_render`、`unified_ws.py` 里处理 `start_turn` 的分支。用笔画箭头：它们最终是否都进到回合运行时？不必跟踪每一行，看出「汇合」即可。

## 下一讲预告

下一讲专看网页：对讲机里嘈杂的事件，怎样被画成你看见的聊天气泡。
