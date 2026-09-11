---
title: "只会 JS，怎么读这份 TS 源码"
summary: "这份仓库的 TypeScript 几乎就是加了类型说明的 JavaScript。根目录 tsconfig.base.json 开了 erasableSyntaxOnly：类型在编译时全部擦掉，剩下的就是能跑的 JS。没有 enum、没有"
tags: [pi, prelude]
---
这份仓库的 TypeScript **几乎就是加了类型说明的 JavaScript**。根目录 `tsconfig.base.json` 开了 `erasableSyntaxOnly`：类型在编译时全部擦掉，剩下的就是能跑的 JS。没有 `enum`、没有 `namespace` 那种会变成别的代码的语法。

所以读源码时，**先当 JS 读执行路径，类型当旁注，看不懂就跳过**。迷茫通常不是因为逻辑难，而是眼睛被 `: string`、`<T>`、`interface` 挡住了。

## 10 秒读一个函数

拿 `packages/coding-agent/src/main.ts` 里的 `resolveAppMode` 当例子。

源码：

```ts
function resolveAppMode(parsed: Args, stdinIsTTY: boolean, stdoutIsTTY: boolean): AppMode {
	if (parsed.mode === "rpc") {
		return "rpc";
	}
	if (parsed.mode === "json") {
		return "json";
	}
	if (parsed.print || !stdinIsTTY || !stdoutIsTTY) {
		return "print";
	}
	return "interactive";
}
```

脑子里擦掉冒号后面的类型，就是 JS：

```js
function resolveAppMode(parsed, stdinIsTTY, stdoutIsTTY) {
	if (parsed.mode === "rpc") return "rpc";
	if (parsed.mode === "json") return "json";
	if (parsed.print || !stdinIsTTY || !stdoutIsTTY) return "print";
	return "interactive";
}
```

读的时候只问三句（和之前一样）：

1. 谁调用它？
2. 它根据什么 `if` 决定走哪条？
3. `return` 出去的值下一站给谁？

类型检查器问的是第四句「parsed 有没有 mode 字段」。你暂时不用当类型检查器。

## 眼睛可以忽略的记号

| 你看到 | 当 JS 怎么理解 | 现在要不要深究 |
|---|---|---|
| `parsed: Args` | 参数名叫 `parsed`，形状在别处用 `type Args` 写过 | 要看字段时再点进 `Args` |
| `: boolean` / `: string` | 「这是真假 / 字符串」，和 JSDoc `@param {boolean}` 一样 | 忽略 |
| `: AppMode`（函数后面） | 「返回值是这几种字符串之一」 | 忽略，看 `return` 就知道 |
| `string \| undefined` | 字符串或没给，相当于 JS 里可能是 `undefined` | 看到 `?.` 和早退 `if (!x) return` 就能懂 |
| `foo?: string` | 可选参数，相当于 JS 里可以不传 | 忽略 |
| `import type { Args }` | **运行时不存在**，只给编辑器看。不会变成 `require` | 跳过，不影响执行路径 |
| `interface Foo { ... }` / `type Foo = ...` | 一份「对象长什么样」的说明书，**运行时删掉** | 需要知道有哪些字段时才打开 |
| `as string` | 「请把它当成字符串」，运行时什么都不做 | 忽略 |
| `satisfies SomeType` | 编译期检查，运行时删掉 | 忽略 |
| `<T>` / `Array<string>` / `Promise<void>` | 泛型 = 「盒子里装什么」。`Promise<void>` = 异步函数不关心返回值 | 先当 `Promise` / `Array` |
| `foo!.bar` | 「我保证 foo 不是 null」，运行时就是 `foo.bar` | 忽略 |
| `d is Error`（类型谓词） | 给 TS 看的 `typeof` 说明书 | 看函数体里的 `if` |
| `.ts` 后缀的 import | 开发时用 tsx 直接跑源码；构建时改成 `.js` | 点进去即可 |

`async` / `await` / `=>` / 解构 / 展开运算，和现代 JS 完全一样。

## 这份仓库里你会反复碰到的几种「说明书」

### 1. 联合类型 = 几种形状二选一（或四选一）

`main.ts` 里：

```ts
type ResolvedSession =
	| { type: "path"; path: string }
	| { type: "local"; path: string }
	| { type: "global"; path: string; cwd: string }
	| { type: "not_found"; arg: string };
```

这不是新语法糖魔法，就是 JS 里常见的：

```js
{ type: "path", path: "..." }
{ type: "not_found", arg: "..." }
```

下面一定跟着 `switch (resolved.type)`。**先看 `type` 字段，再看对应分支。** 这是本仓库最重要的模式，消息、事件、诊断都这样写。

### 2. 对象当配置传入

```ts
const runtime = await createAgentSessionRuntime(createRuntime, {
	cwd: sessionManager.getCwd(),
	agentDir,
	sessionManager,
});
```

和 JS 一样：第二个参数是配置对象。`{ cwd, agentDir, sessionManager }` 里没写 `cwd:` 是因为变量名和字段名相同（简写）。

### 3. 类就是带方法的对象模具

```ts
export class Agent {
	async prompt(...) { ... }
	subscribe(listener) { ... }
}
```

和 JS 的 `class` 一样。`new Agent({...})` 做出一个实例。不必先搞懂构造函数的类型。

### 4. `.ts` 文件互相 import，tsx 直接跑

源码启动不是先 `tsc` 再 `node dist/...`，而是：

```bash
./pi-test.sh --help
```

内部是 `tsx ... packages/coding-agent/src/experimental/cli.ts`。tsx 当场把 TS 擦成 JS 再执行，你在编辑器里打开的 `.ts` 就是正在跑的那份。

## 推荐的读法

1. 打开函数，**先折叠或不看**所有 `type` / `interface` / `import type`。
2. 从 `if` / `return` / `await xxx(` 跟路径。
3. 对看不懂的标识符：那是变量就往上找赋值；那是函数就 `Cmd+点` 跳进去。
4. 只有当你想知道「这个对象到底有哪些字段」时，才打开对应的 `type`。
5. 正课是对着中文注释读源码，见 [README](/series/pi-source/prelude/000-%E6%80%BB%E5%AF%BC%E8%AF%BB/)。Call Stack 是可选的，不是入门门槛。

类型报错、红色波浪线，是给改代码的人用的。精读阶段可以当它们不存在。

下一篇：[02-术语.md](/series/pi-source/prelude/002-%E6%9C%AF%E8%AF%AD/)。然后进 [coding-agent/00-模块导读.md](/series/pi-source/coding-agent/466-%E6%A8%A1%E5%9D%97%E5%AF%BC%E8%AF%BB/)。断点实验：[03-断点调试.md](/series/pi-source/prelude/003-%E6%96%AD%E7%82%B9%E8%B0%83%E8%AF%95/)。
