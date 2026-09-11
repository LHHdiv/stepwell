---
title: "69 · utils/diagnostics.ts — 红acted 运行时笔记"
summary: "formatThrownValue：Error 用 message，否则 String。 extractDiagnosticError：name/message/stack/code。 createAssistantMessageDia"
tags: [pi, ai]
---
源码：`packages/ai/src/utils/diagnostics.ts`  
被谁调用：Anthropic `input_transformations`、Codex WS 失败、pi-messages HTTP 错误。写在 `AssistantMessage.diagnostics`，进会话文件。

## 函数

`formatThrownValue`：Error 用 message，否则 String。  
`extractDiagnosticError`：name/message/stack/code。  
`createAssistantMessageDiagnostic(type, error, details?)`。  
`appendAssistantMessageDiagnostic`：拷数组追加，不 mutate 原数组引用共享问题——其实是换新数组赋回 message。

`type` 是自由字符串（`anthropic_input_transformations`）。details 不要放 token。stack 可能进会话，产品展示时再滤。

## 下一课

延迟工具切分：[70-utils-deferred-tools.ts.md](/series/pi-source/ai/131-utils-deferred-tools-ts/)。
