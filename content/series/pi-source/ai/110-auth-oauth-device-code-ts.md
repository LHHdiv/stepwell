---
title: "49 · auth/oauth/device-code.ts — RFC 8628 轮询"
summary: "各家 device flow 只提供 poll() 返回 pending | slowdown | complete | failed。本文件负责间隔、超时、abort、slowdown 加 5 秒（或采用服务器给的新 interval"
tags: [pi, ai]
---
源码：`packages/ai/src/auth/oauth/device-code.ts`  
被谁调用：github-copilot、kimi-coding、xai、openai-codex device、radius device。

## 本课目标

各家 device flow 只提供 `poll()` 返回 `pending | slow_down | complete | failed`。本文件负责间隔、超时、abort、slow_down 加 5 秒（或采用服务器给的新 interval）。

## 行为

默认 interval 5s（RFC 8628 §3.2），最小 1s。`waitBeforeFirstPoll`：有的服务器要求先等再 poll。

`slow_down`：GitHub 会在 body 里给新 `interval`。**信任服务器值**，不要只在客户端累加——WSL/VM 时钟漂移时客户端累加会永远 poll 过早。超时且曾经 slow_down：错误文案提示对时钟。

`abortableSleep`：abort → `Login cancelled`。deadline 到 → `Device flow timed out`。

## 失败与边界

`poll` throw：不 catch，传到 login。`failed` 用服务器 message。无限 expiresInSeconds（省略）会一直 poll 到 abort。

## 下一课

浏览器回调成功页：[50-auth-oauth-oauth-page.ts.md](/series/pi-source/ai/111-auth-oauth-oauth-page-ts/)。
