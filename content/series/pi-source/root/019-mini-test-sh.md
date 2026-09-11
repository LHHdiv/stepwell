---
title: "15 · mini-test.sh — 实验 mini 宿主的源码启动器"
summary: "弄清 mini 和完整 CLI 的关系：mini 把 TUI 和 session server 拆开，server 是 detached、活得比 TUI 久 的进程。所以本脚本除了启动，还要能杀 server、清 unix socket"
tags: [pi, root]
---
源码：`mini-test.sh`  
被谁调用：维护者调试 `packages/coding-agent/src/experimental/mini/`。**不进 CI，不是课表主入口。** 主入口是 `pi-test.sh`。

## 本课目标

弄清 mini 和完整 CLI 的关系：mini 把 TUI 和 session server 拆开，server 是 **detached、活得比 TUI 久** 的进程。所以本脚本除了启动，还要能杀 server、清 unix socket，否则你改了协议两边对不上还以为是 UI bug。

## 在仓库中的位置

```text
./mini-test.sh                 tsx → src/experimental/mini/main.ts
./mini-test.sh --dist          node → dist/experimental/mini/main.js
./mini-test.sh --fresh         先 pkill mini/server/entry，再启动
./mini-test.sh --stop          只杀 server
./pi-test.sh                   完整 CLI（experimental/cli.ts），另一条路
```

`tsconfig.build.json` 把 `src/experimental` 排除出发布包。`--dist` 需要你先 `npm run build -w @earendil-works/pi-coding-agent`，且这份 build 必须没有把 mini 排除掉——若只跑 coding-agent 的默认 `build`（排除 experimental），`--dist` 会找不到文件并打印那条 hint。

## 文件做什么

### 参数拆分

循环扫描 `$@`：`--dist` / `--fresh` / `--stop` / `--help` 由脚本吃掉，其余推进 `ARGS` 原样交给 mini。`${ARGS[@]+"${ARGS[@]}"}` 是「数组空时不展开成空字符串」的 bash 写法，避免 mini 收到一个空参数。

### `stop_server`

```bash
pkill -f "mini/server/entry" 2>/dev/null || true
rm -f "${PI_AGENT_DIR:-$HOME/.pi/agent}/experimental/mini.sock"
```

按命令行模式匹配杀进程，失败忽略（本来就没在跑）。socket 默认在 `~/.pi/agent/experimental/mini.sock`，可用 `PI_AGENT_DIR` 改。**这会动你的真 agent 目录**，不像 `test.sh` 那样隔离。mini 是给人手调试的，需要连你平时的会话和模型。

`pkill -f` 的风险：模式太宽会误杀。`mini/server/entry` 足够特殊；不要改成 `mini`。

### 两条运行时

- 默认：仓库根的 `node_modules/.bin/tsx` + 根 `tsconfig.json` + 源码 `main.ts`。改 mini 源码立刻生效（TUI 进程）。
- `--dist`：`node` 跑编译后的 js，用来验证「用户不会用 tsx 时」的路径。缺文件就 exit 1，不尝试替你 build。

无论哪条，最后都是 `exec`，shell 被替换成 node/tsx，信号直接到 mini。

## 关键逻辑

注释写得很清楚：session server 不随 TUI 退出。你改了 `mini/` 下的协议或 handler，旧 server 还在用旧代码听 socket，新 TUI 连上去就会表现为「改了代码没反应」或神秘 decode 错误。`--fresh` 是这个设计的配套按钮，不是锦上添花。

失败会怎样：

- 没装依赖：tsx 不存在，exec 失败
- `--dist` 无 build：exit 1，提示 workspace build 命令
- `pkill` 在 macOS 上对已退出进程返回非零：`|| true` 吞掉，`--stop` 仍打印 Stopped
- 杀 socket 但不杀进程：旧 server 可能重建 socket，TUI 连到旧进程。所以必须先 pkill 再 rm

## 和启动链的关系

平行于课表主链。主链是 `pi-test.sh` → `experimental/cli.ts` → `main.ts` → 四种 mode。mini 是 experimental 目录里的另一张皮，用来试「TUI 和 session 分进程」。课表写明 `src/experimental/` 其余部分主链读完再进。本课只要求：看见这个启动器时不要把它当成 `pi-test.sh`。

## 下一课

课表真正的源码入口：[16-pi-test.sh.md](/series/pi-source/root/020-pi-test-sh/)。
