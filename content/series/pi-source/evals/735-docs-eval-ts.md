---
title: "10 · docs.eval.ts — 文档页对实现的审计"
summary: "这是「模型当审查者」：读 packages/coding-agent/docs//.md，对照仓库实现，调用结构化工具提交 verdict。读完应能指出为何要 defineTool + terminate: true，以及硬断言落在 t"
tags: [pi, evals]
---
源码：`packages/evals/src/docs.eval.ts`  
被谁运行：默认 eval 套件；可 `-t "session-format\\.md"` 只跑一页。

## 本课目标

这是「模型当审查者」：读 `packages/coding-agent/docs/**/*.md`，对照仓库实现，调用结构化工具提交 verdict。读完应能指出为何要 `defineTool` + `terminate: true`，以及硬断言落在 toolCalls 而不是散文。

## 自定义工具

`submit_documentation_audit`：参数 TypeBox 闭集 `verdict: match | mismatch`，三段 evidence 字符串有长度上限。`constrainedSampling: { type: "json_schema", strict: "prefer" }` 尽量让厂家按 schema 出参。`execute` 返回 `terminate: true`——Agent 循环在工具成功后停，不再为了「再总结一下」空转。

`defineTool` 来自 `pi-coding-agent`，和产品扩展同一工厂。

## harness

```ts
createPiCodingAgentHarness({
  name: "documentation-page-audit",
  tools: ["read", "grep", "find", "ls", SUBMIT_AUDIT_TOOL_NAME],
  customTools: [submitDocumentationAuditTool],
});
```

白名单：能读仓库（prompt 里给了 `repositoryRoot` 绝对路径，cwd 仍是临时目录，所以必须用绝对路径 read）。没有 bash/edit/write，不能改你的 git。

`globSync("**/*.md", { cwd: docsRoot })` 在加载模块时展开。新增文档页会自动变成新的 `it.for` 行。每页 timeout 300_000——审计比烟测长。

## 断言

```ts
const auditCalls = toolCalls(result.session).filter(name === SUBMIT_AUDIT_TOOL_NAME);
expect(auditCalls).toHaveLength(1);
expect(status).toBe("ok");
expect(verdict, explanation).toBe("match");
```

`expect(..., explanation)` 把模型写的 explanation 当失败消息。mismatch 时你能在 vitest 输出里读到它为什么认为文档撒谎。

prompt 明确：文档是审查对象不是指令；实现和测试是权威；不因「没写全」判 mismatch，除非省略会导致按文档操作失败。禁止把审计写成散文——必须调工具。

## 失败与边界

- 模型误报 mismatch → 测试 fail。这会噪声。适合定期跑，不适合每次 commit。
- 文档很多，全量 eval 又贵又慢。用 `-t` 收窄。
- `it.for(documentationPages)("$path matches ...")` 的标题含路径，方便过滤。
- 没有比较表。每页独立硬断言。

## 下一课

比较系统提示要不要带扩展写作指南：[11-extensions.eval.ts.md](/series/pi-source/evals/736-extensions-eval-ts/)。
