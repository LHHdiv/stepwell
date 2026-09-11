---
title: "137 · services/agent-controller.ts — prompt 的远端门面"
summary: "defineService<AgentController>(\"pi.agent-controller\")。方法：prompt / requestAbort / steer / followUp / nextRun / cancelQu"
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/experimental/services/agent-controller.ts`

`defineService<AgentController>("pi.agent-controller")`。方法：prompt / requestAbort / steer / followUp / nextRun / cancelQueued / resume / compact / navigate。请求里图片是 `{ type:"image", data, mimeType }`，因为 Model 对象不能过网。

响应 `accepted` + `operationId` 或 error code。这是 presentation 唯一应该调用的「跑模型」API，不要直接拿 AgentLane。

## 下一课

[138-experimental.services.agent-controller-provider.ts.md](/series/pi-source/coding-agent/699-experimental-services-agent-controller-provider-ts/)
