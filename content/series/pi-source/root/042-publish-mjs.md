---
title: "38 · publish.mjs — 按锁步版本把公开包推上 npm"
summary: "读循环：对每个公开包 npm view name@version 看是否已发布；无论是否已发布都 npm pack --dry-run --json 验内容；dry-run 到此结束；正式则对未发布的执行 npm publish --a"
tags: [pi, root]
---
源码：`scripts/publish.mjs`  
被谁调用：`npm run publish` / `publish:dry`（先 `prepublishOnly` = clean+build+check）；CI 在 tag 后也可能调（以 workflow 为准）。维护者日常应走 `release.mjs`，它 bump+tag，publish 由后续 CI 做，避免人在脏树上手推。

## 本课目标

读循环：对每个公开包 `npm view name@version` 看是否已发布；无论是否已发布都 `npm pack --dry-run --json` 验内容；dry-run 到此结束；正式则对未发布的执行 `npm publish --access public --provenance --ignore-scripts`。已发布的跳过，所以重跑是安全的（idempotent）。

## 在仓库中的位置

```text
getPublicWorkspacePackages()
  所有 version 必须相同，否则 throw
  每个包 dist/ 必须存在
  isPublished?  npm view
  validatePack  npm pack --dry-run --json 打印文件数和体积
  若 --dry-run: exit 0
  否则对未发布的 npm publish --provenance --ignore-scripts
```

`--provenance` 需要 GitHub Actions OIDC 一类环境才能生成 npm provenance 证明。在笔记本上跑可能失败或没有证明。这是「CI 发版、人只打 tag」的原因之一。

Windows 下命令加 `.cmd`。`run()` 失败把 stdout/stderr 塞进 Error。

## 文件做什么

`isPublished`：view 成功且 stdout 非空 → true；stderr 含 E404 / 404 Not Found → false；其它非零 → throw（网络、auth、registry 挂了不要当成「未发布」然后重复 publish）。

`assertBuildOutputExists` 只查 `dist/` 目录在不在，不查内容。空 dist 仍可能 pack 出残包，所以前面应有 `prepublishOnly` 的 build，后面 consumer smoke 是另一道。

未知参数直接 usage + exit 1。只认识 `--dry-run`。

## 关键逻辑

失败会怎样：

- 版本不锁步：整个 publish 拒绝，不会出现 ai@0.85.1 + tui@0.85.0 这种半发布。若上一包已 publish 本包失败，重跑会跳过已发布的，从失败那包继续——前提是你没改 version
- 某个包 `private` 漏了变成公开：会被 publish。见 21 课
- 本地无 npm login：publish 401
- `--ignore-scripts`：不跑包里的 `prepublishOnly`（根上的 prepublishOnly 在 `npm run publish` 时已经跑过）。若有人直接 `node scripts/publish.mjs` 跳过 npm script，可能没 build/check

## 和启动链的关系

把用户启动链需要的 tarball 送到 registry。进程启动不调用它。

## 下一课

打 tag 的总指挥：[39-release.mjs.md](/series/pi-source/root/043-release-mjs/)。
