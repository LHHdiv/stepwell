---
title: "16 · pi-test.sh — 课表的源码入口"
summary: "盯住最后一行：tsx 加载的是 packages/coding-agent/src/experimental/cli.ts，不是 src/cli.ts。--no-env 卸掉的变量列表必须和 packages/ai/src/env-ap"
tags: [pi, root]
---
源码：`pi-test.sh`  
被谁调用：开发者从任意目录启动本仓库的 pi；[培训课表](/series/pi-source/prelude/000-%E6%80%BB%E5%AF%BC%E8%AF%BB/) 的执行总链第一跳。**不是** npm 上的 `pi` 命令，也不是 `auto-pi.sh`（那个 exec 构建产物）。

## 本课目标

盯住最后一行：tsx 加载的是 `packages/coding-agent/src/experimental/cli.ts`，不是 `src/cli.ts`。`--no-env` 卸掉的变量列表必须和 `packages/ai/src/env-api-keys.ts` 对得上，否则「以为没密钥」其实还在用 `GITHUB_TOKEN` 打 Copilot。

## 在仓库中的位置

```text
任意 cwd: ./path/to/repo/pi-test.sh [args] [--no-env]
  SCRIPT_DIR = 本脚本所在目录（仓库根）
  tsx --tsconfig $SCRIPT_DIR/tsconfig.json
      $SCRIPT_DIR/packages/coding-agent/src/experimental/cli.ts
        setupCli()
        runExperimentalCommand(args) 或 main(args)     → coding-agent 01 课
```

因为 `SCRIPT_DIR` 来自脚本位置而不是 `$PWD`，你在 `/tmp/my-project` 里跑 `/Users/you/pi/pi-test.sh`，cwd 仍是 `/tmp/my-project`（会话、AGENTS.md 按那个项目找），但模块解析走仓库源码。这是「用源码 pi 去改别的项目」的标准姿势。

## 文件做什么

### `--no-env`

从 `$@` 里抽出 `--no-env`，不转发给 CLI。其余参数原样传递，所以 `./pi-test.sh --no-env -p "hello"` 和 `./pi-test.sh -p "hello" --no-env` 都行。

unset 的名单（脚本注释写了去看 `env-api-keys.ts`）：

- 各厂家 API key / OAuth：Anthropic、OpenAI、Gemini、Groq、Cerebras、xAI、OpenRouter、Z.AI、Mistral、MiniMax、Vercel AI Gateway、OpenCode
- GitHub：`COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN`（Copilot 和 gh 工具）
- Hugging Face `HF_TOKEN`
- Google ADC / Vertex：`GOOGLE_APPLICATION_CREDENTIALS`、项目/地区
- AWS / Bedrock 全套
- Azure OpenAI

unset 之后打印 `Running without API keys...`。`~/.pi/agent/auth.json` **还在**。`--no-env` 只剥环境变量，不删已登录的 OAuth。要连本地凭证一起禁，得自己换 `HOME` 或看 `/login` 状态。

### 启动命令

```bash
"$SCRIPT_DIR/node_modules/.bin/tsx" \
  --tsconfig "$SCRIPT_DIR/tsconfig.json" \
  "$SCRIPT_DIR/packages/coding-agent/src/experimental/cli.ts" \
  ${ARGS[@]+"${ARGS[@]}"}
```

没用 `exec`，和 `mini-test.sh` / `auto-pi.sh` 不同。子进程退出码仍会作为脚本退出码（最后一条命令）。没 `exec` 的代价是多一层 bash；好处是以后若要在 CLI 返回后加清理，插得进去。目前后面没有代码。

tsx 必须是**仓库根的**那一份。用 `npx tsx` 可能跑到另一版本，和 `erasableSyntaxOnly` / Node 版本组合出奇怪的 strip 行为。

## 关键逻辑

### 为什么是 experimental/cli.ts

```ts
// experimental/cli.ts
setupCli();
if (await runExperimentalCommand(args)) { ... }
else { await main(args); }
```

```ts
// cli.ts（发布入口）
setupCli();
debugger;
main(process.argv.slice(2));
```

源码入口多了 experimental 子命令分发，并且 `await main`。发布入口有一个 `debugger;` 方便在 Node inspect 下停住。课表 01 讲 experimental，02 对照 cli.ts。本脚本锁死了你读的是 01 那条。

Windows 的 `pi-test.ps1` **走 cli.ts 不走 experimental**。同一仓库、两个平台，入口文件不同。在 Windows 上复现 experimental 子命令要用别的方式，或改脚本——读到 18 课时对照。

### 失败会怎样

- 没在根 `npm install`：`node_modules/.bin/tsx` 不存在，bash 报 No such file。不会 fallback 到全局 tsx（好：版本不会漂）
- 根 tsconfig 的 paths 坏了：tsx 加载到 dist 或报 cannot find module，表现为「改了 agent 包没反应」
- `--no-env` 漏了某个新厂家的 env：你以为在测「未登录」UI，实际环境里的 `FOO_API_KEY` 让模型列表非空。加厂家时必须同时改本脚本、ps1、以及 `env-api-keys.ts`
- 把本脚本当生产入口发给用户：他们没有 tsx、没有源码。用户路径是 npm `pi` 或 `build-binaries.sh` 的可执行文件

## 和启动链的关系

**就是启动链的第一跳。** 下一跳源码是 `experimental/cli.ts`。本模块后面的课（scripts、tui-plan）不再沿这条链往下走；产品链从这里交给 [coding-agent 01](/series/pi-source/coding-agent/467-experimental-cli-ts/)。

## 下一课

Windows 薄包装：[17-pi-test.bat.md](/series/pi-source/root/021-pi-test-bat/)。
