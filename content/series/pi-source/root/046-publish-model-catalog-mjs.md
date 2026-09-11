---
title: "42 · publish-model-catalog.mjs — 把模型目录发布成不可变 revision"
summary: "Pi 客户端会拉网上的模型目录，而不是只信编译进包里的 models.generated.ts。本脚本把 generate:model-catalog 的输出（.artifacts/model-catalog）校验后上传到 models"
tags: [pi, root]
---
源码：`scripts/publish-model-catalog.mjs`  
被谁调用：`.github/workflows/publish-model-catalog.yml`（CI 成功、工作日 Vienna 时间几点、或手动）；`npm run check:model-catalog` 是 `--dry-run`，只验证不上传。

## 本课目标

Pi 客户端会拉网上的模型目录，而不是只信编译进包里的 `models.generated.ts`。本脚本把 `generate:model-catalog` 的输出（`.artifacts/model-catalog`）校验后上传到 `models/v1/revisions/sha256-<digest>/`，再改 `models/v1/index.json`。index 是 `no-store`，revision 是一年 immutable。digest 已存在且已是 default 则什么都不传，避免无意义写。

## 在仓库中的位置

```text
validateBundle(inputDir)
  models.json 对象
  providers.json 必须等于 sorted(Object.keys(models))
  每个 providers/<id>.json 必须深等于 models[id]
  每个 model.id / model.provider 自洽
  必须含 anthropic、openai、openrouter
  模型总数 >= 500
  revision = sha256(models.json 字节)

dry-run: 写 publication.json，打印，返回
否则:
  下载现有 index（可 404）
  若 defaultRevision 已是本 digest: 跳过
  上传 models.json、providers.json、每个 shard
  buildIndex: 同一 minimumPiVersion 的旧条目换成本条，按 version 排序
  上传 index.json
```

`MINIMUM_PI_VERSION = "0.80.7"`：只有当生成的元数据需要新客户端行为时才 bump。index 里可以同时存在多条 catalogs（不同 minimumPiVersion），旧客户端继续用它能懂的那条。`buildIndex` 会 **滤掉** 相同 minimumPiVersion 的旧条目再 concat——同一能力门槛只保留最新 revision。

## 文件做什么

校验失败的典型原因：生成器只写了 models.json 忘了 shard、providers.json 顺序乱、某个模型 id 字段和 key 不一致、厂家目录当天异常导致模型数 < 500（防止把空目录当成合法发布，打挂所有客户端）。

`aws s3 cp` 带 content-type JSON 和 cache-control。缺 `--bucket/--endpoint` 且非 dry-run → throw。sourceCommit 默认 HEAD。

## 关键逻辑

失败会怎样：

- dry-run 在 PR 上跑：生成器坏了能在合入前发现，不会污染生产 index
- 上传了 revision 但 index 失败：多了一个不可变对象，index 仍指旧 default。重跑会再传一遍同样 key（幂等）然后改 index
- 误 bump MINIMUM_PI_VERSION：旧客户端永远看不到新模型，直到用户升级。这是刻意闸门
- 模型数阈值 500 过大或过小：过小失去保护，过大在删减厂家时误伤。改这个数字是发布政策

## 和启动链的关系

CLI 启动后 ModelRuntime 可能拉这份目录（受 `PI_OFFLINE` 等设置影响）。`pi-test.sh --no-env` 仍可能用 `~/.pi` 缓存或编译进包的生成数据。发版模型数据进独立二进制走的是 hydrate + archive，和本 R2 目录是两条通道。

## 下一课

给 diff 工具用的思考等级投影：[43-generate-thinking-capabilities.mjs.md](/series/pi-source/root/047-generate-thinking-capabilities-mjs/)。
