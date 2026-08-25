---
title: 第04讲·跑起来：三种形态与插件树实拍
summary: 把 dsh 从源码构建、运行，用 --dump-config 亲眼看到插件装配树——世界观落地成手感。
objectives:
  - 完成从源码构建 dsh 的全流程
  - 成功以 headless 或 web 形态启动一次
  - 看懂 --dump-config 输出的插件树结构
tags: [deepseek-harness, 动手, 环境]
keyPoints:
  - 构建：pnpm install && pnpm run build（需要 pnpm 与 Node ≥22）
  - 运行前必须配置 DEEPSEEK_API_KEY 环境变量
  - dump-config 能打印实际生效的插件配置树，是排查问题的第一工具
---

前面三讲都在建立认知。这一讲动真格的：把 dsh 从源码跑起来。

## 准备

1. **Node.js ≥ 22**：`node --version` 确认；
2. **pnpm**（dsh 用它管理 monorepo）：`npm install -g pnpm`；
3. **DeepSeek API Key**：在 [platform.deepseek.com](https://platform.deepseek.com) 申请，后面配成环境变量。

## 构建与运行

```bash
# 克隆（如果你已 fork，换成你的仓库地址）
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness

# 安装依赖 + 构建（首次较慢，耐心）
pnpm install
pnpm run build

# 配置 API Key（macOS/Linux）
export DEEPSEEK_API_KEY="sk-你的key"

# 形态一：Web 界面（会自动打开浏览器，地址 127.0.0.1:3080）
pnpm dsh web

# 形态二：无界面单次运行
pnpm dsh headless "用一句话介绍你自己"
```

跑通任意一种形态，你就拥有了一个真正运行中的智能体。试着在 web 界面里问它一个**需要用工具的问题**，比如"当前目录下有哪些文件？"——观察它先调用工具、再回答的两段式行为，那就是第 02 讲讲的 step。

## 亲眼看看插件树

现在做一件更有意思的事。运行：

```bash
pnpm dsh --profile web --dump-config
```

终端会打印一棵 **YAML 配置树**——这就是 Cordis 实际装载的全部插件清单：

```yaml
# 示意结构（你的输出会长得多）
children:
  - id: llm-deepseek        # DeepSeek 模型适配器插件
    children:
      - id: credentials     # 它依赖的凭据管理插件
  - id: tools               # 工具注册表插件
    children:
      - id: tool-read-file  # 读文件工具（每个工具都是独立插件！）
      - id: tool-glob       # 文件名匹配工具
      - …
```

三个观察点：

1. **每个工具都是树上的一个叶子节点**——印证"一切皆插件"；
2. **父子关系就是依赖关系**——`llm-deepseek` 下面挂着它的凭据服务；
3. **这棵树是配置出来的，不是代码写死的**——理论上你可以编辑 YAML 增删节点，改变智能体的能力构成。

以后你定制自己的智能体时，这棵树就是你的驾驶舱：加了什么、没加什么、哪里配错了，都来 `--dump-config` 看真相。

## 常见翻车点

| 症状 | 多半是 |
|---|---|
| build 报内存不足 | 关掉大程序重试；monorepo 全量构建很吃内存 |
| 启动后模型请求 401 | `DEEPSEEK_API_KEY` 没导出成功，`echo $DEEPSEEK_API_KEY` 检查 |
| `pnpm dsh` 找不到命令 | 先确认 `pnpm run build` 无报错地完成了 |

## 试一试

分别用 `--profile web` 和 `--profile headless` 跑一次 `--dump-config`，对比两棵树的差异。你能发现 web 形态比 headless 多了哪些插件吗？（提示：找名字里带 host、client、server 的节点。）

## 下一讲预告

卷一完结。卷二我们潜入数据层：先学两个贯穿全仓库的类型模式（Branded ID 与事件映射），再逐行精读 session 日志的数据结构——那 441 行的 types.ts 是一切的地基。
