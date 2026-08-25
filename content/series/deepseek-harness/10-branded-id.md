---
title: 第10讲·Branded ID：用类型系统消灭"张冠李戴"
summary: 从一个真实隐患出发，精读 dsh 的品牌类型原语，顺带修一门 TypeScript 类型体操小课。
objectives:
  - 说出结构化类型（structural typing）带来的 ID 混用隐患
  - 读懂 Branded<B> 类型的一行实现并解释其零运行时成本
  - 掌握 dsh 的"品牌政策"：什么样的字符串才配被品牌化
tags: [deepseek-harness, typescript, 类型体操]
keyPoints:
  - TS 是结构化类型系统："形状相同即可互换"，这让两个不同的 ID 可以互相冒充
  - "Branded<B> = string & { readonly [BRAND]: B }，用交叉类型制造名义类型效果"
  - 品牌化是编译期行为，运行时就是普通 string——工厂函数里一次 as 强转，零开销
  - 政策：只有跨包边界、可能混淆的 ID 才品牌化（CallId、SessionId、JobId）
---

卷二从地基开始，而地基的第一块砖不是什么宏大的架构，而是一个几乎每份工业代码都要面对的小问题：**怎么防止两个长得一样的 ID 被搞混？** dsh 给出的答案只有一行 TypeScript——但这背后是整个类型系统的世界观。这一讲我们把它讲透，顺便补齐后面 29 讲都需要的类型知识。

## 一、问题：当所有 ID 都是 string

dsh 里到处都是 ID：一个会话有 `SessionId`，一次工具调用有 `CallId`，一个后台任务有 `JobId`。在运行时，它们全是普普通通的字符串。麻烦来了——先看一段会出事的代码：

```ts
function getResult(callId: string) { /* 按 CallId 查工具结果 */ }
function getSession(id: string) { /* 按 SessionId 查会话 */ }

const sid = 'session-42'
getResult(sid)   // ✅ 编译通过！运行时才炸——拿会话 ID 去查工具结果
```

`sid` 和 `callId` 在 TypeScript 眼里形状完全相同（都是 `string`），所以互换毫无障碍。这类 bug 最阴险的地方是**编译器沉默、测试可能侥幸通过、直到某天在生产环境炸响**。

根源在于 TypeScript 的类型判定规则——**结构化类型（structural typing）**：只要两个类型的成员结构一致，它们就被视为兼容，哪怕名字完全不同。这和 Java、C++ 的"名义类型"（nominal typing，名字不同即不兼容）相反。结构化让 TS 的类型推断极其灵活（你随便写个对象字面量就能传给接口参数），但代价就是上面这种"形同实异"的混淆。

> 💡 **知识拓展：两种类型世界观**
> - **名义类型**：类型身份由"声明时的名字"决定。Java 里 `String` 和自定义的 `MyString` 永远不能互换，除非显式继承/转换。
> - **结构化类型**：类型身份由"内部形状"决定。TS 选了这条路是为了无缝消化 JavaScript 的动态生态。
> 那想要名义类型的安全性又离不开 TS 怎么办？自己动手造——这正是 Branded ID 要做的事。

## 二、Brand 的实现：一行类型的魔法

打开 `packages/util/brand/src/index.ts`（dsh 把这个原语做成了独立的零依赖包 `@deepseek-ai/dsh-brand`），核心就两行：

```ts
// 一个编译期独有的符号——它只存在于类型世界，运行时不存在
declare const BRAND: unique symbol

/** 一个携带编译期品牌 B 的 string */
export type Branded<B extends string> = string & { readonly [BRAND]: B }
```

拆开看这三个零件：

1. **`declare const BRAND`**：告诉编译器"存在一个叫 BRAND 的符号"，但不要生成任何运行时代码（`declare` 就是纯粹的类型声明）；
2. **`unique symbol`**：TS 中唯一一种"每个声明都是独立类型"的类型——两次声明 `unique symbol` 绝不相等，这就制造出了不可伪造的"印章";
3. **`string & { ... }`**：交叉类型（intersection）。`Branded<'SessionId'>` 的意思是"它是一个 string，同时还盖着一枚叫 'SessionId' 的章"。string 该有的方法一个不少，但类型身份变了。

于是刚才的事故变成了编译错误：

```ts
type SessionId = Branded<'SessionId'>
type CallId    = Branded<'CallId'>

const sid = 'session-42' as SessionId   // 盖章需要显式强转
getResult(sid)  // ❌ 编译报错：SessionId 不能赋给 CallId——张冠李戴当场抓获
```

那"盖章"发生在哪？在每个 ID 所属包里的**工厂函数**，比如 `core/session/src/types.ts` 开头：

```ts
export type SessionId = Branded<'SessionId'>

/** 把原始字符串品牌化为 SessionId（编译期强转——零运行时成本） */
export function SessionId(id: string): SessionId {
  return id as SessionId   // 唯一的入口：想拿到带品牌的 ID，必须过这道门
}
```

注意注释里的承诺：**compile-time cast — no runtime cost**。`as` 强转在编译后完全消失，运行时它就是个普通字符串——日志打印、JSON 序列化、数据库存储全部照旧。这就是这个模式的精髓：**把检查成本全部转移给编译器，运行时一分钱不花**。

## 三、dsh 的品牌政策：不是所有 string 都配盖章

读源码要留意"克制"。brand 包的文档明确写了政策：

> 一个包为自己**拥有的、跨越包边界的、可能被混淆的** ID 品牌化。

具体只有三类：`CallId`（llm 包，工具调用的关联凭证）、`SessionId`（session 包，agent 与 session 共享）、`JobId`（jobs 包，后台任务）。为什么不给所有字符串盖章？因为品牌化有真实的阅读成本——到处都是 `as` 会稀释注意力。**只在"历史上真的容易搞混"的边界上设卡**，这是工程判断力，比技巧本身更值得学。

还有一个细节体现严谨：brand 包甚至配了一个"不变量伴侣"插件（invariant companion），注册进 dsh 的不变量检查体系——虽然它自己没有任何运行时不变量（纯类型工具靠单测保障），但走完了整个注册流程。这种"每个包都遵守同一套纪律"的一致性，是大型 monorepo 不腐烂的关键。

> 💡 **知识拓展：这个模式在业界叫什么？**
> Branded Type（品牌类型），也叫 Nominal Typing Simulation 或 Opaque Type 别名。GraphQL 客户端、货币处理库（区分 USD/EUR 金额）、单位制库（区分米/英尺）都用它。核心思想一句话：**用交叉类型给基础类型"纹身"，纹身内容编译期可验、运行时蒸发**。你在第 16 讲还会见到它的变体——scope 包里的 `ScopedBrand`。

## 试一试

打开 [TypeScript Playground](https://www.typescriptlang.org/play)，粘贴本讲的"事故代码"，先确认 `getResult(sid)` 真的能编译通过；然后加上 `Branded` 定义和 `as` 强转，观察编译器如何翻脸。再试一个问题：如果把 `{ readonly [BRAND]: B }` 里的 `readonly` 删掉会怎样？（提示：想想谁可能篡改这枚章。）

## 下一讲预告

ID 的身份问题解决了，接下来看这些 ID 标记的对象本身。下一讲我们逐条精读 `SessionEventMap`——dsh 会话日志的完整词汇表：13 种事件各记什么、为什么 `todo/write` 明明写进了日志却不进模型历史。这是卷二的中央枢纽。
