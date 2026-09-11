---
title: "60 · login-dialog.ts — OAuth / API key 登录流程 UI"
summary: "无 session。实现 AuthPrompt 那一套：调用方（ModelRuntime 的 login）通过组件方法要输入、展示 device code、打开浏览器。内部 Input Enter 把值交给 pending Promis"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/components/login-dialog.ts`  
谁创建：`showLoginDialog` / `showApiKeyLoginDialog`，替换 editor 槽。

## 订阅什么

无 session。实现 `AuthPrompt` 那一套：调用方（ModelRuntime 的 login）通过组件方法要输入、展示 device code、打开浏览器。内部 `Input` Enter 把值交给 pending Promise。Esc `cancel()` abort。`openBrowser` 点链接。

`signal` 暴露给 login 流程，取消时中止轮询。

## 画什么

边框、标题 `Login to {provider}`、动态内容区（说明、device code、等待、错误）、需要时一行 Input。提交后 Input 换成静态 `> value`，防止密码还留在可编辑框。

## 失败与边界

完成后 `onComplete(success, message)`，InteractiveMode 拆掉对话框、提示用 `/model`。llama.cpp 登录成功还有「先 /llama 再选模型」的文案。

## 下一课

[61-trust-selector.ts.md](/series/pi-source/coding-agent/577-trust-selector-ts/)
