---
title: 第02讲·跑起来：从源码到你的第一次对话
summary: 安装、构建、配置 API key、跑通 TUI——并认识配置文件的目录布局。
objectives:
  - 完成从源码运行 pi 的全流程
  - 认识 ~/.pi/agent/ 配置目录结构
  - 学会用 tmux 调试 TUI
tags: [pi, 动手, 环境]
keyPoints:
  - npm install --ignore-scripts + npm run build + ./pi-test.sh 三步跑通
  - 配置根目录是 ~/.pi/agent/（settings.json / auth.json / sessions/ / skills/）
  - 无 API key 也能跑：测试用 faux provider 返回预设响应
---

卷一最后一站：亲手把 pi 跑起来。

## 三步跑通

```bash
cd Project/pi
npm install --ignore-scripts   # 跳过生命周期脚本（安全习惯）
npm run build                  # 刷新模型数据 + 全量构建
./pi-test.sh                   # 从源码直接跑 pi
```

`pi-test.sh` 的本质是一行 tsx 命令：直接以 TypeScript 源码启动 `packages/coding-agent/src/cli.ts`——改完代码立刻能试，不用重新构建。

## 配置目录：~/.pi/agent/

跑起来之后，pi 的世界都在这个目录里：

```
~/.pi/agent/
├── settings.json    # 全局设置（默认模型/主题/压缩参数…）
├── auth.json        # 供应商凭据（API key / OAuth）
├── models.json      # 自定义供应商与模型
├── sessions/        # 会话 JSONL（按项目路径分目录！）
├── skills/          # 你的 Skills（SKILL.md 文件）
└── themes/          # 主题
```

注意 `sessions/` 的组织方式：**按项目路径分目录**。目录名把路径编码成 `--Users-lijunkai-Project-pi--` 这样的形式（`session-manager.ts` 第 474 行的逻辑）——你在哪个目录启动 pi，会话就归到哪个项目名下，天然隔离。

## 配置的合并规则

pi 的设置分两层：全局 `~/.pi/agent/settings.json` + 项目级 `<项目>/.pi/settings.json`。**深合并，项目覆盖全局**。比如全局默认用 DeepSeek，某个项目想用 Claude，就在那个项目里放一份只写 `defaultModel` 的 settings.json。这个"全局兜底 + 项目覆盖"的模式，你以后做任何工具都会用到。

## 没有 API key 也能玩

pi 的测试体系里有个可爱的发明：**faux provider**（`packages/ai/src/providers/faux.ts`）——一个返回预设响应的假供应商。测试集成套件全用它，禁止真实 API（不烧钱、可复现）。你甚至可以在 settings 里手动指定它来体验流程。

## TUI 调试的正确姿势

TUI 程序没法直接看 console.log（会打乱界面）。pi 官方建议用 tmux：

```bash
tmux new-session -s pi -x 80 -y 24   # 开一个 80x24 的会话
./pi-test.sh                          # 在里面跑 pi
# 另开一个窗口：tmux capture-pane -p  # 抓取屏幕内容来"看"界面
```

固定 80×24 是为了让渲染可复现——这是 TUI 测试的通用技巧。

## 试一试

跑通后，在 TUI 里依次试试 `/model`（看模型列表）、`/settings`、`/new`（新会话）。然后去 `~/.pi/agent/sessions/` 找到你刚才的会话文件，用编辑器打开——第一行应该是 `type: "session"` 的 header（卷五的主角）。

## 下一讲预告

卷二开始，潜入 pi 的最底层：pi-ai 包。第一站是它的类型宇宙——831 行的 types.ts。
