---
title: "35 · build-binaries.sh — Bun compile 出各平台 `pi`"
summary: "看清产物不是「一个 js 文件 + node」，而是 bun build --compile 的独立可执行文件，并且必须把 worker 入口、wasm、主题、native .node、docs/examples 拷到旁边。漏拷 ima"
tags: [pi, root]
---
源码：`scripts/build-binaries.sh`  
被谁调用：维护者本机；`.github/workflows/build-binaries.yml`（先用 `create-source-archive.sh` 打源码包，再**从解压后的 archive 里**跑本脚本，保证用户下载的 source tarball 能复现官方二进制）；`local-release.mjs` 带 `--skip-install --skip-build --platform <本机>`。

## 本课目标

看清产物不是「一个 js 文件 + node」，而是 `bun build --compile` 的独立可执行文件，并且必须把 **worker 入口、wasm、主题、native .node、docs/examples** 拷到旁边。漏拷 image-resize-worker 会在运行时才爆。README 的「Building standalone binaries from release source」就是在教用户跑本脚本。

## 在仓库中的位置

```text
./scripts/build-binaries.sh [--skip-install] [--skip-build]
                            [--offline-model-data] [--platform x] [--out dir]
  默认: npm ci --ignore-scripts
        npm run build 或 build:offline
  cd packages/coding-agent
  对每个平台:
    bun build --compile --no-compile-autoload-bunfig --target bun-<platform>
      ./dist/bun/cli.js
      ./src/utils/image-resize-worker.ts
      → out/<platform>/pi 或 pi.exe
    拷 package.json README CHANGELOG
    拷 photon wasm、theme json、assets、export-html、docs、examples
    拷 packages/tui/native/<os>/prebuilds/<platform>
  tar.gz（Unix，外包一层 pi/ 目录给 mise）或 zip（Windows）
  再解压回来方便本机试
```

合法平台：`darwin-arm64/x64`、`linux-x64/arm64`、`windows-x64/arm64`。x64 的 bun target 带 `-baseline`，避免在老 CPU 上因 SIMD 挂掉。

## 文件做什么

### `--no-compile-autoload-bunfig`

注释指向 issue **#7684**：Bun 编译出的可执行文件若自动加载 cwd 的 `bunfig.toml` preload，可能在 pi 启动前就因项目配置崩溃。关掉 autoload，standalone 只信自己编进去的代码。

### 为什么 worker 要当第二入口

Bun compile 只有把文件列进 command line 才会 embed。运行时 `new URL("./image-resize-worker.ts", import.meta.url)` 需要这份脚本已在可执行文件里。只编 `cli.js` 会在真正 resize 图片时找不到 worker。

入口是 `./dist/bun/cli.js`，不是 Node 的 `dist/bundle/cli.js`。coding-agent 为 Bun 另有一份打包（jiti/static 要被 embed）。两条发布形态：npm 用 Node bundle，独立二进制用 Bun compile。

### 资源文件

可执行文件旁边必须有：photon wasm（图片）、交互主题 JSON、assets、HTML export 模板、docs、examples。native helper 按平台从 `packages/tui/native/.../prebuilds` 拷贝，路径把 `windows-` 换成 `win32-`。缺 prebuild 时 `cp` 失败，`set -e` 让整脚本停——不会默默交出一个没有剪贴板加速的残包。

Unix archive 先把目录改名为 `pi/` 再 tar，是为了 mise 等工具期望的布局；打完再改回平台名，并解压供测试。

## 关键逻辑

失败会怎样：

- 没装 bun：`bun build` 找不到
- `--skip-build` 但没有 `dist/bun/cli.js`：compile 失败
- 只编当前平台却想在 CI 交叉编译：Bun 支持 `--target bun-linux-x64` 这类交叉，所以 Ubuntu runner 能出 darwin/windows 包。交叉失败时看 bun 版本（workflow 钉了 bun 1.3.14）
- `--out` 落在仓库内且未 gitignore：`packages/coding-agent/binaries/` 已 ignore。换到别的路径可能把多 MB 的二进制弄脏 git status
- 用户按 README 解压 source archive 后不加 `--offline-model-data`：会尝试 `npm run build` 去刷新模型，断网即死。官方 workflow 从 archive 构建时带上该 flag

## 和启动链的关系

独立二进制用户的启动链：直接 exec `pi`，不再经过 npm bin 或 tsx。开发者课表仍是 `pi-test.sh`。`local-release.mjs` 会打印「从仓库外跑这个 pi --help」，就是在测这条链有没有误解析到仓库里的 tsconfig。

## 下一课

官方二进制所依据的源码包如何打：[36-create-source-archive.sh.md](/series/pi-source/root/040-create-source-archive-sh/)。
