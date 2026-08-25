---
title: 第10讲·Branded ID：给字符串盖上"防伪印章"
summary: dsh 全仓库最基础的模式：如何用 TypeScript 类型系统防止"把用户 ID 当成会话 ID 用"这类低级错误。
objectives:
  - 理解 Branded Type 解决什么真实问题
  - 能读懂 brand 包的全部源码（它只有几十行）
  - 学会在自己的项目里使用这个模式
tags: [deepseek-harness, typescript, 类型系统]
keyPoints:
  - Branded Type = 在 string 上盖一个编译期才能看见的"印章"，运行时零开销
  - 不同印章的 ID 不能互相赋值，混用会在编译期直接报错
  - dsh 里所有 ID（会话/工具调用/消息）都是 Branded，这是防混用的地基
---

在进入会话系统之前，必须先学一个贯穿全仓库的"语法词汇"：**Branded Type（品牌类型）**。它是 dsh 数据模型的地基，而且只有几十行代码——是我们第一个能"全部读完"的源码文件。

## 先看一个真实事故场景

假设没有类型保护，这样的代码能通过编译：

```ts
const userId = "usr_123";
const sessionId = "sess_456";

// 把用户 ID 当成会话 ID 传进去了——运行时才发现，排查半天
loadSession(userId);
```

两个都是字符串，编译器认为完全合法。项目一大、参数一多，这类 bug 防不胜防。

## dsh 的解法：brand 包

打开 `packages/util/brand/src/index.ts`，核心就这几行：

```ts
declare const BRAND: unique symbol;

/** A string carrying a compile-time-only brand `B`. */
export type Branded<B extends string> = string & {
  readonly [BRAND]: B;
};
```

逐行拆解（小白版）：

- `declare const BRAND: unique symbol` —— 声明一个**只存在于类型世界**的符号，编译后运行时不存在，纯粹给类型系统看的"暗记"；
- `string & { readonly [BRAND]: B }` —— 这是 TypeScript 的**交叉类型**：既是 string，又额外带一个印章属性。印章的值 B 是泛型，用来区分不同用途。

于是各种 ID 就有了自己的"专属类型"：

```ts
type SessionId = Branded<"SessionId">;
type CallId = Branded<"CallId">;
type UserId = Branded<"UserId">;
```

## 印章怎么盖上去？

光有类型还不够，需要一个"盖章函数"：

```ts
export function brand<B extends string>(value: string, _brand: B): Branded<B> {
  return value as Branded<B>;
}
```

注意 `as`——这里是**故意绕过类型检查**。因为印章在运行时不存在，所以盖章只是"骗"编译器：请从现在起把这个字符串当作带印章的类型对待。这个不安全点被收敛在一个几行的函数里，其余全部代码享受类型保护。这是工程上的经典手法：**把危险隔离在最小范围内**。

## 效果：混用直接编译报错

```ts
const sessionId = brand("sess_456", "SessionId");
const userId = brand("usr_123", "UserId");

loadSession(userId);
// ❌ 编译错误：UserId 不能赋给 SessionId
// 印章不同，类型系统视为两个不相干的类型
```

而运行时呢？`brand()` 没有任何包装，就是一个原字符串——**零性能开销**。这就是这个模式精妙的地方：用编译期的"纸上约束"换运行期的"真金白银安全"。

## 为什么 dsh 全仓库都用它

回忆第 02 讲：session 日志里每个事件都带 `callId`、`turn`、`step`。这些 ID 在事件之间来回传递、被存进日志、又被查询接口取出来。如果没有印章，一个手滑传错 ID，bug 会潜伏到运行时；有了印章，**写代码的那一刻编辑器就划红线了**。

对将来的你还有一层意义：你基于 dsh 写自己的插件时，自定义的 ID 也应该用 `brand()` 盖章——这是融入这套代码库的"普通话"。

## 试一试

不用克隆 dsh 也能玩：任意建一个 `test.ts`，把上面 `Branded`、`brand`、两个 ID 的例子抄进去，执行 `npx tsc --strict test.ts`，亲眼看看那个红色报错。再把 `userId` 换成 `sessionId`，报错消失——这就是类型系统在替你把关。

## 下一讲预告

印章盖好了，该盖在什么东西上？下一讲我们读 `llm` 包的 content.ts 和 message.ts——模型对话的"原子词汇表"：Message、ContentBlock、StreamChunk。
