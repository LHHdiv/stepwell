---
title: 第10讲·两层插件：BaseTool 与 BaseCapability
summary: 精读 core/tool_protocol.py 与 capability_protocol.py——DeepTutor 插件体系的两份"合同"。
objectives:
  - 读懂 BaseTool 的完整合同（定义/执行/两个控制字段）
  - 理解 Capability 与 Tool 的本质区别（接管整轮 vs 单发调用）
  - 理解 deferred 工具的"渐进披露"设计
tags: [deeptutor, 插件, 协议]
keyPoints:
  - ToolResult 带 terminate_turn 和 pause_for_user 两个循环控制字段
  - Capability 有 manifest（名称/阶段/工具清单/CLI 别名）
  - deferred=True 的工具不进初始 schema 列表，按需加载
---

第 01 讲说 DeepTutor 是"两层插件模型"。今天读这两层的合同原文——都在 `deeptutor/core/` 下。

## Level 1：BaseTool（单发工具）

`tool_protocol.py` 里的抽象类（节选原文）：

```python
class BaseTool(ABC):
    deferred: bool = False   # 渐进披露：schema 不进初始列表，经 load_tools 按需加载

    @abstractmethod
    def get_definition(self) -> ToolDefinition: ...

    @abstractmethod
    async def execute(self, **kwargs: Any) -> ToolResult: ...
```

和 dsh 的 defineTool 惊人地相似：**定义（给模型看）+ 执行（真正干活）**。但 DeepTutor 多了两个精妙设计：

**其一，ToolResult 自带"循环控制权"**。它有两个字段：`terminate_turn`（工具可以要求直接结束本轮）和 `pause_for_user`（工具可以要求暂停，等用户回复再继续）。想想 `ask_user` 这个工具——它执行时就是要把控制权交还给人。把"打断循环"做成工具返回值的字段，而不是循环里的特判，这个设计让任何工具都能优雅地影响流程。

**其二，deferred（渐进披露）**。模型每次请求能看到工具清单，但清单太长会稀释注意力、浪费 token。`deferred=True` 的工具（所有 MCP 工具都是）**不进初始清单**，模型需要时通过 `load_tools` 按需加载。这是上下文工程在工具管理上的应用。

## Level 2：BaseCapability（接管整轮）

`capability_protocol.py` 的合同核心是 manifest（能力清单）：

```python
class ChatCapability(BaseCapability):
    manifest = CapabilityManifest(
        name="chat",
        stages=["exploring", "responding"],   # 前端显示的执行阶段
        tools_used=CHAT_OPTIONAL_TOOLS,        # 本能力会用到的工具
        cli_aliases=["chat"],                  # CLI 里怎么调
    )
    async def run(self, context, stream):
        ...
```

Tool 和 Capability 的区别，用餐厅类比：**Tool 是服务员的一次跑腿**（去厨房端个菜）；**Capability 是一整桌宴席的流程**（先上什么后上什么、中途要不要问客人口味）。Chat/Quiz/Research/Visualize/Solve/Mastery 各是一个 Capability——六大模式 = 六个 Capability，共享底层的工具与循环。

注意 `stages` 字段：能力可以声明自己的执行阶段（"探索中→回答中"），前端据此显示进度——能力协议连 UX 都考虑进去了。

## 注册表：合同生效的地方

`runtime/registry/` 下有 `tool_registry.py` 和 `capability_registry.py`。启动时 `load_builtins()` 装载内置工具/能力，MCP 外部工具热重载走 `unregister`+重注册。第 01 讲的旅程图里"编排器路由到 Capability"，查的就是这张注册表。

## 对你的启发

将来给你的家庭智能体加能力时，用这个两层模型想问题：**"查天气"是 Tool，"晨间简报"是 Capability**（它要串起查天气+读日历+生成语音三个工具）。先分层，再动手——层次对了，代码自然清晰。

## 试一试
打开 `deeptutor/tools/builtin/__init__.py`，数一数内置工具清单。挑一个你最好奇的（比如 web_search），找到它的实现文件，只看 get_definition()——description 是怎么写给模型看的？

## 下一讲预告
合同有了，履行合同的"法官"是谁？下一讲读全项目的灵魂：标签协议（Label Protocol）——模型每次回复的第一行，决定整个循环的走向。
