---
title: "36 · create-source-archive.sh — 可复现的发版源码 tar.gz"
summary: "看懂为什么不直接 git archive HEAD：模型 JSON 和部分 native prebuild 在 .gitignore 里，但离线复现二进制必须带上它们。脚本用 临时 git index：read-tree 某个 comm"
tags: [pi, root]
---
源码：`scripts/create-source-archive.sh`  
被谁调用：`build-binaries.yml` 在 hydrate 模型数据之后、调用 `build-binaries.sh` 之前。产物进 GitHub Release 的 `pi-<version>-source.tar.gz`，有 SHA256SUMS。

## 本课目标

看懂为什么不直接 `git archive HEAD`：模型 JSON 和部分 native prebuild 在 `.gitignore` 里，但离线复现二进制必须带上它们。脚本用 **临时 git index**：`read-tree` 某个 commit，再 `git add -f` 那些被 ignore 的模型文件，`write-tree` 后 `git archive --mtime=<commit timestamp>`，gzip `-n -9` 保证同样 commit + 同样模型数据 → 字节级可复现。

## 在仓库中的位置

```text
npm run hydrate:model-data     先把 providers/data 落到工作树
./scripts/create-source-archive.sh --version 0.85.1 --ref HEAD --out path.tar.gz
  校验 version == 该 commit 上 coding-agent/package.json 的 version
  校验 .manifest.json 和至少一份 json 存在
  git read-tree + add -f model json
  git archive --prefix=pi-VERSION/
  检查必含路径、不含 node_modules 和 binaries/
  解压到临时目录跑 packages/ai/scripts/check-model-data.ts
  mv 到 --out
```

`--ref` 默认 HEAD。version 正则只允许 `[0-9A-Za-z._-]`，防止 `pi-${version}` 前缀做出路径穿越。

## 文件做什么

### 必含路径清单

硬编码了一串「没有就不能离线编出官方二进制」的文件：根 package.json/lock、`build-binaries.sh`、`models.generated.ts`、image-models 生成物、模型 manifest、tui native 的头文件和各平台 `.node` prebuild、linux `build.sh`、coding-agent 的 worker 源和 HTML 模板 css。缺任一 → 拒绝上传一个不能复现的 archive。

### 禁止路径

manifest 里出现 `node_modules/` 或 `packages/coding-agent/binaries/` → 失败。archive 应该让接收者自己 `npm ci`。所有条目必须在 `pi-<version>/` 前缀下。

### 校验模型数据

解压后对 archive 内的 `check-model-data.ts` 跑 node。这是 **archive 自洽性**：不能只信工作树，要信打进去的那份。

`gzip -n` 去掉文件名/时间戳；`--mtime=@commit` 让 tar 成员时间钉死。两次在同一 commit、同一模型数据上跑，校验和应相同——Release 的 SHA256SUMS 才有意义。

## 关键逻辑

失败会怎样：

- 忘了 hydrate：缺 manifest，脚本立刻退，不会打出「能编但模型列表为空」的包
- version 和 tag 不一致：例如 tag v0.85.1 但包还是 0.85.0 → 拒绝。workflow 用 `RELEASE_TAG#v` 当 version
- 有人从脏工作树打 archive：`--ref HEAD` 用的是 commit 内容 + 强制加的工作树模型文件。未提交的源码改动 **不会** 进 archive（read-tree 是 commit），但模型 JSON 来自工作树。所以 CI 必须先 checkout 再 hydrate，不要在 hydrate 同时改源码
- `git archive` 缺 native prebuild：清单检查会抓到，因为那些 `.node` 是跟踪文件（不在 gitignore），不在 tree 里说明源码缺失

## 和启动链的关系

无运行时。它是「第三方从 GitHub Release 复现 `pi` 二进制」的起点。官方 workflow 甚至不在 checkout 的工作树上直接 `build-binaries.sh`，而是 archive → 解压 → 再 build，把「archive 能否复现」从口号变成每次发版都走的路径。

## 下一课

发版前在仓库外做的全套演习：[37-local-release.mjs.md](/series/pi-source/root/041-local-release-mjs/)。
