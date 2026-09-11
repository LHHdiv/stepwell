---
title: "57 · auth/oauth/xai.ts — SuperGrok / X Premium 设备码"
summary: "标准设备码打 auth.x.ai。verification URI 强制 https（validateVerificationUri），恶意响应不能让 open 执行别的 scheme。refresh 提前 5 分钟。toAuth → "
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/xai.ts`  
被谁调用：xai 厂家 oauth。

## 本课目标

标准设备码打 `auth.x.ai`。verification URI **强制 https**（`validateVerificationUri`），恶意响应不能让 `open` 执行别的 scheme。refresh 提前 5 分钟。`toAuth` → `{ apiKey: access }`。

scope：`openid profile email offline_access grok-cli:access api:access`。

缺字段的 JSON 用 `requiredString` / `positiveNumber` 立刻 throw，避免把 `undefined` 当 token 存起来。

默认 token 寿命 3600s（响应没 expires_in 时）。

## 失败与边界

非 https verification：throw Untrusted。device poll 的 failed 映射服务器 error。loginLabel 「Sign in with SuperGrok or X Premium」给 UI 选登录方式时显示。

## 下一课

工具层从事件队列开始：[58-utils-event-stream.ts.md](/series/pi-source/ai/119-utils-event-stream-ts/)。所有 `stream()` 的返回值都是它。
