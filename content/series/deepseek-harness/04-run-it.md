---
title: 第04讲·动手：把 dsh 跑起来并看穿它的插件树
summary: 两条安装路径、web 与 headless 两种形态、--dump-config 与四层装配叠加顺序。
objectives:
  - 用 npx 或源码两种方式之一把 dsh 跑起来
  - 读懂 --dump-config 输出的插件配置树
  - 说清 profile、bundle、patch 三者的关系与叠加顺序
tags: [deepseek-harness, 实操, profile]
keyPoints:
  - 最快路径：npx @deepseek-ai/dsh web，浏览器打开 127.0.0.1:3080
  - 运行中的 dsh 是一棵按序叠加的插件树；--dump-config 把它打印给你看
  - 叠加顺序：bundle 按序 → profile 的 patch → home 级 patch → 命令行 --patch
  - 打印出的任何条目都可以被你的 patch 替换——这就是"一切皆插件"的兑现
---

前两讲我们看了流程图和插线板，全是"纸上谈兵"。这一讲通电：把 dsh 真正跑起来。而且我们不满足于"能聊天"——要用一条命令**看穿它的插件树**，亲眼验证第 03 讲讲的"一切皆插件"。

## 一、两条路：npm 直达与源码构建

**路线 A：npm 包直达（推荐首次体验）**

```sh
# 前提：Node.js 22+（终端 node --version 验证）
npx @deepseek-ai/dsh web
```

`npx` 会临时下载 dsh 的 npm 发布包并执行 `web` 子命令。成功后默认在 `http://127.0.0.1:3080` 启动 Web UI，本机运行还会自动打开浏览器。加 `--no-open` 可以只起服务不开页面（SSH 远程场景下它只打印宿主机 URL，因为转发地址由你的 SSH 客户端持有）。

**路线 B：源码构建（本系列推荐——我们要读的就是源码）**

```sh
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install          # 安装 50 多个包的全部依赖
pnpm run build        # 构建仓库产物
pnpm dsh web          # 直接用已构建产物启动，不会重新构建
```

> 💡 **知识拓展：pnpm 是什么？和 npm 什么关系？**
> pnpm 是新一代包管理器，定位和 npm/yarn 相同，但对 monorepo 支持更好：通过 workspace 协议让包之间互相引用源码而非发布版，且用硬链接节省磁盘。dsh 这种 50 多个包的仓库，用 pnpm workspace 才能保证"改了 core/session，依赖它的包立刻看到"。装 pnpm：`npm install -g pnpm`。

两条路跑起来的东西一样，但路线 B 让你随时可以改一行源码重启验证——后面卷九的开发工作区就架设在它之上。

## 二、两种出厂形态：web 与 headless

你可能注意到了命令里的 `web`。dsh 出厂自带两个 **profile（具名组装）**：

- **`web`**：带完整浏览器应用的形态——你在 3080 端口看到的界面就是它；
- **`headless`**：无服务器的一次性运行器——不启动任何 UI，跑完即退出，适合脚本化和自动化任务。

同一个发动机，两种驾驶舱。这个差别不是 if/else 写出来的，而是第 03 讲的插件树装配差异：`web` profile 比 `headless` 多挂了一层 Web 应用插件而已。

## 三、--dump-config：给插件树拍 X 光

现在做本讲最重要的事：

```sh
dsh --profile web --dump-config
```

终端会打印出一棵**配置树**：当前这次启动实际挂载的所有条目——模型适配器、每一个工具、持久化后端、沙箱策略、设置、凭据管理……每个条目有自己的 id 和 config。

官方文档有一句分量很重的话：

> 它打印出的任何条目，都可以由你自己的 patch 替换。

这句话就是"一切皆插件"的兑现形式：你看到的每一件器官都是可替换的。第 82 讲毕业设计里，你会真的写一个 patch 把某个内置工具换成自己的实现——今天先学会"看片"。

## 四、装配的四层叠加顺序

那这棵树是怎么长出来的？官方文档给出了精确的叠加顺序，像千层饼一样自下而上：

```text
第 1 层  bundle 按序叠加     # profile 列出的组合包，逐个应用其挂载代码与配置
第 2 层  profile 的 patch    # 该 profile 自带的 cordis.patch.yml
第 3 层  home 级的 patch     # 你机器上 Harness home 里那份全局 patch
第 4 层  --patch overlay     # 命令行临时指定的补丁（调试神器）
```

先解释两个新词。**bundle（组合包）**是 Cordis 配置项及其挂载代码的分发格式——`dsh-base` 是所有 profile 的第一层（模型适配器、工具、持久化、沙箱与审批策略都在里面），`dsh-web-app` 在其上加浏览器应用，`dsh-headless` 则加一次性运行器且不带服务器。**patch（补丁）**则是一条条修改指令：按 id 定位树上某个条目，替换它的整个 config，或者插入全新条目。

这套分层设计的精妙之处在于**可预测性**：同一条目被多层 patch 命中时，永远是上层覆盖下层，没有玄学。如果你熟悉 CSS 的优先级规则或 Docker 的镜像层，会发现这是同一种智慧——**层叠覆盖，越靠近用户的话语权越大**。

> 💡 **知识拓展：为什么要分 profile / bundle / patch 三层？**
> 这是"分发粒度"的设计。bundle 解决"怎么把一堆插件打包卖"；profile 解决"用户怎么一键选一套组合"；patch 解决"用户怎么在不 fork 上游的前提下做个性化修改"。三者合起来，让"官方默认配置"与"你的定制"永远分离——升级 dsh 时，你的定制原样保留。个人智能体项目（卷九）会重度依赖这一机制。

## 试一试

三步实验，把今天的知识落地：

1. 用任一路线启动 `dsh web`，在界面里随便聊两句；
2. Ctrl-C 停掉，改跑 `dsh --profile web --dump-config > tree.txt`，打开 tree.txt 搜几个你在卷一认识的关键词：`sessions`、`tools`、`llm`——找到它们的挂载点了吗？
3. 再跑 `dsh --profile headless --dump-config > tree2.txt`，`diff tree.txt tree2.txt` 看看两种形态差在哪一层。（没有 diff 命令的话，肉眼对比即可）

## 卷一回顾 · 下一卷预告

四讲走完，你已经拥有：harness 世界观（第 00 讲）、全仓地图（第 01 讲）、消息的一生（第 02 讲）、插线板原理（第 03 讲）、以及一台自己跑起来的机器（本讲）。

从下一卷开始进入地基工程：dsh 敢于承诺"断电重启后一切如初"，靠的是一套仅追加的事件日志。第 10 讲我们先从一个看似不起眼却无处不在的类型技巧讲起——Branded ID，顺便开一门 TypeScript 类型体操小灶。
