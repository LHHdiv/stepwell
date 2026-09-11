---
title: "11 · .gitignore — 生成物与本机噪声的边界"
summary: "能指出：模型厂家 JSON、CPU profile、本地 .pi 会话、coding-agent 二进制产物分别被哪一行挡住，以及 哪一类被 ignore 的文件反而必须进 Release archive。发版脚本和本文件是一对张力。"
tags: [pi, root]
---
源码：`.gitignore`  
被谁调用：git（status / add / commit）；`scripts/create-source-archive.sh` 基于 git tree，被 ignore 的路径默认不进源码包，除非脚本强制 `git add -f`。

## 本课目标

能指出：模型厂家 JSON、CPU profile、本地 `.pi` 会话、coding-agent 二进制产物分别被哪一行挡住，以及 **哪一类被 ignore 的文件反而必须进 Release archive**。发版脚本和本文件是一对张力。

## 在仓库中的位置

```text
工作树
  源码          git 跟踪
  dist/         ignore  ← 由 npm run build 生成
  node_modules/ ignore  ← npm ci 生成
  packages/ai/src/providers/data/   ignore  ← hydrate:model-data 生成
  packages/coding-agent/binaries/   ignore  ← build-binaries.sh 生成
  .artifacts/   ignore  ← generate:model-catalog 输出
```

`.gitignore` 不阻止 `--force` 添加。`create-source-archive.sh` 正是对 `providers/data/*.json` 做 `git add -f` 打进临时 index，因为离线编译需要它们，但日常 PR 不想看到厂家目录的巨 diff。

## 文件做什么（按意图分组）

### 构建与依赖

`node_modules/`、`dist/`、`packages/*/dist/`、`dist-chrome` / `dist-firefox`、`*.tsbuildinfo`。注释掉的 `# packages/*/node_modules/` 表示曾经考虑过只忽略包内安装，后来改成根级 `node_modules/` 一条——workspace 安装本来就 hoist 到根。

### 模型数据

`packages/ai/src/providers/data/` 和 `.model-generation-*`。`models.generated.ts` **没有**被 ignore（源码跟踪），但厂家原始 JSON 忽略。`hydrate:model-data` 在 CI / 发版时重新拉。新鲜 clone 后若不 hydrate，`check-browser-smoke.mjs` 会用空 JSON 插件顶上，避免 esbuild 因缺文件失败。

### 本机与编辑器

`.env`、`.vscode/`、`.zed/`、`.idea/`、`.claude/`、swap 文件。注意：**仓库里实际存在 `.vscode/` 目录**（list_dir 能看到），但 git 默认不跟踪。团队规范靠 AGENTS.md 而不是靠提交 editor config。

`.pi_config/`、`.opencode/`、`tui-debug.log`、`compaction-results/`、`syntax.jsonl`、`out.jsonl`、`pi-*.html`：跑 pi 或调试 TUI 留下的。`packages/coding-agent/binaries/` 是独立可执行文件输出，体积大且平台相关。

### 会话与计划草稿

`.pi/hf-sessions/`、`.pi/hf-sessions-backup/`：Hugging Face 分享用的本地缓存，不能进 git（可能含代码和秘密）。`todo.md`、`plans/`、`collect.sh` 是维护者草稿名，强制 ignore 以免 agent 把计划文件提交上去。

### 其它

`*.cpuprofile`：`profile-coding-agent-node.mjs` 的输出。`coverage/`、`.nyc_output/`、`.npm/`、`.DS_Store`、`*.log`。最后一行忽略一份生成的 agent 文档 `packages/agent/docs/extensions/pi-server-artifact/index.md`。

## 关键逻辑

ignore 的原则：**能从源码和 lockfile 再生的，不进 git；平台二进制和厂家快照，日常不进 git，发版再塞进 archive。**

失败会怎样：

- 有人把 `dist/` 提交了 → PR 出现几千行编译产物，且和源码双源真相
- 忘了 ignore `.env` → API key 进历史，SECURITY.md 也救不回，只能轮换密钥
- 把 `providers/data/` 跟踪进 git → 每次模型刷新 PR 不可读；现在的设计是 ignore + 发版 `git add -f`
- 误 ignore `npm-shrinkwrap.json` 或 `install-lock/` → 发布 CLI 丢失钉死的传递依赖，`check:shrinkwrap` 会在「文件缺失」时红，所以这两份是跟踪的

`package-lock.json` 不在 ignore 里，是供应链真值。挡误提交的是 hook，不是 gitignore。

## 和启动链的关系

不进运行时。影响 `./pi-test.sh` 的间接方式：tsx 跑源码，不依赖 `dist/` 是否被 ignore。`scripts/auto-pi.sh` 依赖 `dist/bundle/cli.js`，那份文件被 ignore，所以必须先 `npm run build`。clone 后只跑 `pi-test.sh` 可以不 build；只跑 `auto-pi.sh` 不行。

## 下一课

npm 客户端自己的安全门：[12-.npmrc.md](/series/pi-source/root/016--npmrc/)。
