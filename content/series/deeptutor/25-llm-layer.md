---
title: 第25讲·不同品牌的模型，怎样接到同一间教室
summary: 上层只说「请讲一段」，中间的 LLM 服务层负责挑厂商、翻译格式、限流重试，教室不必认每家口音。
objectives:
  - 能用人话说清「厂商 / 后端 / 工厂」各管哪一层
  - 知道日常调用走 complete 与 stream，差异主要在要不要边吐边看
  - 明白换模型通常改配置，而不是改聊天循环
tags: [deeptutor, LLM, 厂商适配]
keyPoints:
  - 上层只喊 complete / stream，不直接碰各家 SDK
  - provider_factory 按 backend 挑实现，多数走 OpenAI 兼容
  - 配置换模型；聊天刹车和工具契约尽量不跟着换
---

家教班里请来过好几位老师：有的爱板书，有的爱口述，有的要从专用门禁刷卡进教室。学生只问「傅里叶是什么」，不该关心今天值班的是哪家云。DeepTutor 在聊天循环和真正的大模型之间，垫了一层 **LLM 服务层**（LLM service）：上面统一说「请讲」，下面负责对接不同品牌。

## 上层只喊两声：讲完整段，或边讲边传

一句话定义：**LLM 服务层**是把「用哪个模型、怎么发请求、怎么收回复」从教学逻辑里拆出去的翻译台。为什么需要它？因为 OpenAI、Anthropic、Azure、本地 Ollama 的 SDK 和消息长相都不一样；若聊天循环直接认每一家，换模型就要改刹车代码。

日常入口在 `deeptutor/services/llm/factory.py`：

- **`complete`**：等整段讲完再交卷，适合内部一步算完就够的场合。
- **`stream`**：模型一个字一个字吐，立刻往直播线推，适合学生盯着屏幕的辅导。

两条路都会先解析「这一轮用哪份配置、哪家厂商」，再交给真正的 provider。配置来自运行时设置（仓库约定读 `data/user/settings/`，不读项目根目录的 `.env`）。上层写 `from deeptutor.services.llm import complete, stream` 就够了——`deeptutor/services/llm/__init__.py` 把这套门面公开了出来。

流式时还会做一点礼貌：攒几个字再推一次，避免每个字符都刷一次界面；遇到思考片段，会用约定的控制标记包一下，方便前端分「心里话」和「板书」。

> 小结：教室只学两种口令——整段讲完，或边讲边传。

## 按「后端类型」挑接线员，不是按广告牌

一句话定义：**provider（提供商适配器）**是真正会说话的接线员；**backend** 是它用哪套方言接线。为什么需要分类？因为有的厂商长得像 OpenAI，有的要走 Anthropic 消息结构，有的是 Azure 部署名。

`deeptutor/services/llm/provider_factory.py` 里的 `_build_runtime_provider` 按规格表里的 `backend` 分支：

| backend | 大致对应 |
| --- | --- |
| `openai_compat`（默认） | 多数云厂商与本地兼容接口 |
| `anthropic` | Claude 一系 |
| `azure_openai` | Azure 上的 OpenAI 部署 |
| `openai_codex` / `github_copilot` | 各自专用接线 |

厂商名、关键词、默认地址写在 `deeptutor/services/provider_registry.py`：你可以按名字查，也可以按模型名反推「这大概是哪家」。工厂里还有一个小池子：同一套配置复用同一个 provider 对象，免得每个字都新建连接。

「会不会看图、会不会工具调用」这类能力探测，也集中在服务层（`deeptutor/services/llm/capabilities.py` 一带），上层按结果决定要不要塞图片、要不要带工具清单——而不是在聊天循环里硬编码「某品牌特殊」。

> 小结：认的是接线方言（backend），不是海报上的品牌口号。

## 换模型像换老师，不该拆教室装修

设置页或配置里改模型 / Key / Base URL 后，下一轮提问会走新的 config。聊天循环仍然用「还按不按工具」当刹车；出题循环仍然认标签灯；工具仍然交 `ToolResult`。**教学契约稳定，模型品牌可换**——这正是服务层存在的理由。

出错时，服务层会尽量把各家乱七八糟的错误翻成统一异常，并按重试策略再试（限流、瞬时断线常见）。上下文太长时，还有窗口相关的裁剪与检测，避免把超长讲义整本塞进一次请求。细节文件在 `deeptutor/services/llm/` 目录里，本讲不必逐个背名。

本地模型（例如带常见本地端口的服务）也会被识别成「本地 LLM 服务器」，仍然走同一套 `complete` / `stream`，只是地址指向你的机器。

> 小结：换老师改课表配置；黑板规矩别跟着老师姓改。

## 试一试

打开 `deeptutor/services/llm/provider_factory.py`，找到 `_build_runtime_provider`，数一数它认几种 `backend`。再打开 `deeptutor/services/provider_registry.py` 顶部注释，看「加一家新厂商」官方建议动哪几处。不必真的加厂商，能把「规格表 → 工厂 → complete/stream」连成一条线即可。

## 下一讲预告

下一讲换教室的另一扇门：模型写的代码为什么不能直接在主机上跑，而要关进沙箱。
