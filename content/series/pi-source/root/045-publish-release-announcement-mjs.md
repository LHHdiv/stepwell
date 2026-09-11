---
title: "41 · publish-release-announcement.mjs — 等 npm 齐了再宣布最新版"
summary: "理解为什么 publish npm 之后还不能立刻让 pi update 看到新版本：registry 是最终一致的。本脚本对每个公开包 GET registry.npmjs.org/<name>/<version>，再 HEAD ta"
tags: [pi, root]
---
源码：`scripts/publish-release-announcement.mjs`  
被谁调用：tag 之后的 CD（对象存储凭证在 GitHub environment）。测试：`publish-release-announcement.test.mjs` 只测版本比较和 `advanceLatestRelease` 的并发语义，不碰 AWS。

## 本课目标

理解为什么 publish npm 之后还不能立刻让 `pi update` 看到新版本：registry 是最终一致的。本脚本对每个公开包 `GET registry.npmjs.org/<name>/<version>`，再 HEAD tarball，失败就睡 5 秒，最多等 10 分钟。全绿才写 R2：

- `releases/v1/releases/<ver>.json` 不可变记录
- `installer/v1/releases/<ver>/{package.json,package-lock.json,metadata.json}`
- 两个 `latest.json` 指针，用 ETag `If-Match` / 不存在时 `If-None-Match: *`

指针只允许前进，不允许被更旧的版本覆盖。

## 在仓库中的位置

必填参数：`--bucket --endpoint --version --installer-package-json --installer-package-lock`，可选 `--source-commit`（默认 `git rev-parse HEAD`）。

先断言每个 `getPublicWorkspacePackages()` 的 version === `--version`。然后 `verifyPackagesAreAvailable`。再组 `release` 对象：schemaVersion 1、sourceCommit、publishedAt、每包的 tarball URL 和 integrity。

## 文件做什么

### `advanceLatestRelease(version, readLatest, writeLatest)`

循环最多 5 次：读当前 latest；若已有版本 `>=` 要宣布的，返回 `{ advanced: false }`；否则用当前 etag（或 missing）条件写；写失败（412）则重读。这是丢失更新控制：两个 workflow 同时宣布 0.85.0 和 0.85.1 时，较新的赢，较旧的不会把指针打回去。

`compareReleaseVersions` 只接受稳定 `x.y.z`，beta 直接 throw——预发布不能当 latest。

### S3 API

`aws s3api` + `AWS_EC2_METADATA_DISABLED=true`（和 test.sh 同一理由：不要去打实例元数据）。`allowNotFound` 把 404 变成 undefined。条件写失败当「没写上」而不是致命，交给 advance 重试。

installer 工件上传同样 `{ missing: true }`：同一版本重跑不会覆盖不可变对象。latest 是 `no-store`，release json 是 `max-age=31536000, immutable`。

`validateInstallerArtifacts` 确认传入的 install-lock 描述的就是这个 version 的 `@earendil-works/pi-coding-agent-install`。

## 关键逻辑

失败会怎样：

- 10 分钟内 npm 仍 404：throw，latest 不变，用户继续拿到上一版。可以修完 registry 后重跑——不可变对象已存在会 log already exists
- aws 凭证错：throw。可能已经写了 release json 但没动 latest。重跑安全
- 时钟回拨导致 publishedAt 乱：只是元数据，指针靠 semver 不靠时间
- 测试覆盖：较新 marker 不回退；412 后读到更新版本则放弃；缺失 marker 用 if-none-match 创建

## 和启动链的关系

`pi update` / 安装器读 `latest.json`，不读 GitHub Release 标题。npm 已经有包但 announcement 失败时：`npm i -g @earendil-works/pi-coding-agent@x.y.z` 仍可精确安装，自动更新通道停在旧版。这是刻意的：宁可晚宣布，也不让更新器装到缺 tarball 的版本。

## 测试

见文件：`compareReleaseVersions` 数值序（0.84.10 > 0.84.9）；beta 抛错；`advanceLatestRelease` 的不回退、重试、创建。

## 下一课

模型目录的同类发布：[42-publish-model-catalog.mjs.md](/series/pi-source/root/046-publish-model-catalog-mjs/)。
