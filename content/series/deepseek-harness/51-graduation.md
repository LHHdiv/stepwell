---
title: 第51讲·毕业设计：写出你的第一个插件包
summary: 综合六卷所学，手把手完成一个带测试的完整插件包——你的智能体第一个专属能力。
objectives:
  - 独立完成一个插件包的目录结构与代码
  - 学会用真实 API 测试自己的插件
  - 拿到"个人智能体开发"的持续路线图
tags: [deepseek-harness, 插件开发, 毕业设计]
keyPoints:
  - 插件包 = package.json + 导出 apply/inject 的入口 + 测试
  - 用真实 API 测试（有 key 跑、无 key 跳过）是 dsh 的测试哲学
  - 毕业不是终点：每周一个新能力，智能体陪你一起长大
---

六卷读完，是时候交付毕业设计了：**写一个完整的插件包**。我们做一个实用又简单的——「每日一句」：智能体启动时向系统提示词注入今天的格言，并且提供一个 `daily_quote` 工具让用户主动索取。

## 第一步：包的骨架

在你的工作区建包（可以放在 dsh 仓库外的独立目录，用 pnpm link 接入；也可以直接放进 monorepo）：

```
dsh-plugin-daily-quote/
├── package.json        # name/exports/依赖声明
├── src/
│   └── index.ts        # 插件入口
└── tests/
    └── quote.spec.ts   # 测试
```

package.json 要点：`type: "module"`；exports 指向 src/index.ts；依赖里声明 `@deepseek-ai/dsh-core` 等你用到的包（版本对齐官方仓库）。

## 第二步：插件本体（综合运用六卷知识）

```ts
// src/index.ts
import { defineTool } from '@deepseek-ai/dsh-tools';
import { brand } from '@deepseek-ai/dsh-brand';

const QUOTES = [
  '拾阶而上，每天向上一步。',
  '种一棵树最好的时间是十年前，其次是现在。',
  // …
];

// ① 工具：defineTool（第 30 讲）
const dailyQuote = defineTool({
  name: 'daily_quote',
  description: '获取今日格言。当用户想要激励、格言或每日一句时使用。',
  parametersSchema: { type: 'object', properties: {} },
  async execute() {
    const q = QUOTES[new Date().getDate() % QUOTES.length];
    return { content: q };
  },
});

export default function apply(ctx: Context) {
  // ② 注册工具（第 03 讲的插座）
  ctx.tools.register(dailyQuote);

  // ③ 注入系统提示词段落（第 23 讲）
  ctx.systemPrompt.register({
    id: 'daily-quote-hint',
    text: '用户情绪低落时，可以主动用 daily_quote 工具送上一句格言。',
  });
}

export const inject = ['tools', 'systemPrompt'];  // ④ 声明依赖（第 03 讲）
```

二十来行，串起了插件声明、工具定义、提示词注入三个知识点。这就是 dsh 扩展的全部体感：**小而清晰**。

## 第三步：测试（dsh 的哲学）

dsh 的测试哲学是"**优先真实实现**"：有 API key 就跑真实模型验证，没有 key 自动跳过（CI 里用快照回放兜底）。你的插件测试照此办理：

```ts
// tests/quote.spec.ts
import { describe, it, expect } from 'vitest';
import { dailyQuote } from '../src/index';

describe('daily_quote 工具', () => {
  it('返回 1-100 字的格言字符串', async () => {
    const out = await dailyQuote.execute({});
    expect(typeof out.content).toBe('string');
    expect(out.content.length).toBeGreaterThan(0);
  });
});
```

跑 `pnpm vitest`。绿了？恭喜，你的第一个插件毕业了。

## 接入你的智能体

在 dsh 的用户配置目录写一份 `cordis.patch.yml`（第 50 讲的 patch 层），把你的包挂进配置树，`--dump-config` 确认节点出现，然后对你的智能体说"来一句今日格言"——看它调用你写的工具。

## 持续路线图（毕业不是终点）

把"个人/家庭超级智能体"拆成每周一个小能力，按难度递进：

| 周 | 能力 | 用到的知识 |
|---|---|---|
| 1 | 每日一句（本讲） | 工具+提示词 |
| 2 | 读你的笔记库并回答问题 | fs 工具 + 检索 |
| 3 | 家庭日程管理 | 写工具 + 审批策略 |
| 4 | 定时提醒（cron 注入消息） | inject + inbox（第 20 讲） |
| 5 | 换/加模型供应商 | 适配器（第 40-41 讲） |
| 6+ | 子智能体分工、上下文压缩调优 | subagent/compaction 包（自学） |

每一项都对应系列里精读过的模块——遇到卡壳，回到对应讲次复习，再去读源码原文。**以写促学、以用促读**，这个循环会陪你把 dsh 真正变成终身伙伴。

## 试一试（毕业答辩）
不看本讲，独立写一个"单词卡"插件：工具 `flashcard` 随机返回你收藏的单词和释义，并在系统提示词里教模型"学习对话中主动抽考"。写完对照本讲自查四要素：包结构、defineTool、register、inject。全对，你就正式从本系列毕业了。

## 结语
从第 00 讲的"什么是马具"到今天亲手给马装上新鞍具——你已经走过了完整的拾阶之路。接下来，去 pi 系列看看另一种设计哲学，去 DeepTutor 系列看看 AI 如何当老师。三条路最终都通向同一个地方：**你与 AI 共同成长的生活**。
