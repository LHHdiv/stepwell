---
title: "09 · tsconfig.json — 整仓源码的类型检查入口"
summary: "看懂 paths 为什么把每个 @earendil-works/ 指到 packages//src，以及 include / exclude 如何决定「check 看得到、build 编不进」的代码（例如 src/experimenta"
tags: [pi, root]
---
源码：`tsconfig.json`  
被谁调用：`npm run check` 里的 `tsgo --noEmit`；`./pi-test.sh` / `mini-test.sh` 的 `tsx --tsconfig .../tsconfig.json`。各包 **build 不用这份**，它们用自己的 `tsconfig.build.json`。

## 本课目标

看懂 `paths` 为什么把每个 `@earendil-works/*` 指到 `packages/*/src`，以及 `include` / `exclude` 如何决定「check 看得到、build 编不进」的代码（例如 `src/experimental`）。这是本地开发和发布产物分叉的类型层根源。

## 在仓库中的位置

```text
tsx --tsconfig tsconfig.json experimental/cli.ts     源码启动
tsgo --noEmit                                        check 的类型步
packages/coding-agent/tsconfig.build.json            发布编译（不 include experimental）
```

`extends: ./tsconfig.base.json`，再覆盖三件事：`noEmit`、`module/moduleResolution: NodeNext`、一整张 `paths`。

## 文件做什么

### noEmit + NodeNext

根配置只做类型检查。`module: NodeNext` 比 base 的 `Node16` 更「新」，对 `exports` 条件导出更严。check 用更严的解析，build 用 Node16 + 自己的 paths——若某个子路径只在源码 alias 里存在、没在包的 `exports` 里，会出现：**tsx 能 import，用户从 npm 装完却 import 不到。** 这正是 `coding-agent-consumer.mjs` 要抓的类问题（`/client`、`/experimental/plugin` 必须不可解析）。

### paths：开发时的包重定向

每一条都把 npm 名指到**源文件**：

```json
"@earendil-works/pi-ai": ["./packages/ai/src/index.ts"],
"@earendil-works/pi-ai/*": ["./packages/ai/src/*.ts", "./packages/ai/src/providers/*.ts"],
"@earendil-works/pi-coding-agent": ["./packages/coding-agent/src/index.ts"],
```

没有这张表，`./pi-test.sh` 会跑到 `node_modules/@earendil-works/pi-ai` 里上次 `npm run build` 留下的 dist，你改了 `packages/ai/src` 却看不见效果。有了这张表，tsx 和 tsgo 都当源码是一份。

几个容易误读的条目：

- `*` → `./*`：把非包名的裸导入也试着当相对仓库根。少用，别依赖它写业务 import。
- `@earendil-works/pi-ai/dist/*` → `packages/ai/src/*`：有的旧导入写了 `dist/`，被拧回 src，避免开发时加载过期 JS。
- `@earendil-works/pi-agent-old`：给旧包留的 alias。目录若已不在，这条就是死路径，check 只有在有文件 import 它时才会爆。
- `typebox` → `./node_modules/typebox`：钉死解析，防止 hoisting 到另一份。
- coding-agent 的 `experimental/plugin` 和 `hooks` 有精确条目，比 `/*` 通配更先匹配。

### include / exclude

```json
"include": [
  "packages/*/src/**/*",
  "packages/*/test/**/*",
  "packages/session-backends/*/src/**/*",
  "packages/session-backends/*/test/**/*",
  "packages/coding-agent/examples/**/*"
],
"exclude": ["**/dist/**", "packages/coding-agent/examples/extensions/gondolin/**"]
```

- 根 `scripts/` **不在 include 里**。所以 `scripts/cost.ts` 的类型错误不会让 `tsgo --noEmit` 失败。脚本是「维护者工具」，用 tsx 即跑即走，不进产品类型门。
- gondolin 示例被 exclude：它有自己的依赖/类型环境，塞进根 check 会要求一堆本仓没有的 DOM 或外部类型。
- `packages/evals` 若结构符合 `packages/*/src`，会被 check 看到。

对比 coding-agent 的 build tsconfig：`exclude` 含 `src/experimental`、`src/client`、`src/cli/experimental`。于是：

```text
tsgo（根配置）        看得到 experimental/cli.ts，你改它类型错了 check 会红
tsc build（包配置）    不编 experimental，npm 包里没有这份入口
pi-test.sh            用 tsx 跑源码，所以能进 experimental
已安装的 pi            跑 dist/bundle/cli.js，来自 src/cli.ts
```

课表为什么从 `experimental/cli.ts` 起手，类型层在这里已经分叉。

## 关键逻辑

这份文件是 **IDE 和 tsx 的地图**，不是发布地图。发布地图是各包 `package.json` 的 `exports` + `tsconfig.build.json` 的 paths（指向 dist `.d.ts`）。

失败会怎样：

- 新增一个包忘了加 paths → 根 check 报 cannot find module；tsx 可能落到 node_modules 旧 dist，表现为「改了代码没变化」
- 只在 paths 加了子路径、没在 `exports` 加 → 本地 SDK 示例能跑，用户 npm 安装后炸。用 `npm run check:package-install` 抓
- 把 `scripts/` 加进 include → 维护脚本的宽松类型（不少 `.mjs` 根本无类型）倒灌进 check
- `noEmit` 被去掉 → `tsgo` 可能在根目录写出一堆 js，污染仓库（`.gitignore` 有 `*.tsbuildinfo` 但没有根级 js 输出防护）

## 和启动链的关系

直接在链上：

```text
./pi-test.sh
  → tsx --tsconfig tsconfig.json
  → packages/coding-agent/src/experimental/cli.ts
```

tsx 用这里的 paths 把后续所有 `@earendil-works/pi-agent-core` 解析到源码。这就是「不 build 也能跑源码」的全部秘密。

## 下一课

测试侧同一张地图：[10-vitest.base.ts.md](/series/pi-source/root/014-vitest-base-ts/)。
