---
title: "47 · update-source-imports-to-ts.sh — 把相对 `.js` 导入改成 `.ts`"
summary: "看 perl 正则覆盖的三种位置："
tags: [pi, root]
---
源码：`scripts/update-source-imports-to-ts.sh`  
被谁调用：历史上的模块格式迁移；现在若 `check-ts-relative-imports.mjs` 扫出一堆旧导入，可再跑。不进 npm scripts / CI。

## 本课目标

看 perl 正则覆盖的三种位置：

1. `from ".../x.js"` / `import(".../x.js")`
2. `declare module ".../x.js"`
3. `importNodeOnlyProvider(".../x.js")`（ai 包特有的懒加载 helper）

只改 `packages/*/src/**/*.ts`（mindepth/maxdepth 限制在每个包的 `src` 这一层目录名）。测试文件、scripts、examples 不在范围内——它们若写了 `.js`，check 脚本仍会红，得手改或扩大 find。

## 在仓库中的位置

```bash
find packages -mindepth 2 -maxdepth 2 -type d -name src
  find 其中 *.ts
  xargs perl -0pi -e 's/...js.../...ts.../g'  （三组正则）
```

`-0` 让 perl 以 NUL 分隔吃 xargs `-0` 的路径，文件名含空格也安全。`-pi` 就地改。没有备份。

`rewriteRelativeImportExtensions` 在 tsc emit 时把 `.ts` 再写回 `.js`。本脚本只动源码。

## 关键逻辑

失败会怎样：

- 正则误伤字符串里的 `.js` 文本：`from`/`import` 边界要求 `from` 或 `import` 关键字，误伤面小于全局 replace，但仍可能改到注释中的伪导入
- `maxdepth 2` 漏掉 `packages/session-backends/sqlite-node/src`？`packages/session-backends/sqlite-node` 是 depth 3，`src` 是 depth 4，**不匹配** `-mindepth 2 -maxdepth 2`。session-backends 不会被本脚本改到。check 脚本会扫全仓 ts。迁那包得手跑或改 find
- 无 perl：macOS 自带，精简容器可能没有
- 跑完不跑 check：可能留下 `declare module` 没盖全的模式

这是一次性机械臂，不是日常闸门。闸门是 26 课。

## 和启动链的关系

间接：源码导入扩展名错误时 `pi-test.sh` 的 tsx 会找不到模块。

## 下一课

Windows WSL bash 的回归夹具：[48-repro-5893-wsl-bash.mjs.md](/series/pi-source/root/052-repro-5893-wsl-bash-mjs/)。
