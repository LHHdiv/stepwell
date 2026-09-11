---
title: "41 · api/openrouter-images.ts — OpenRouter 图生接口"
summary: "图像不是 SSE：一次非流 chat.completions.create，modalities: [\"image\"]，从 message.images[].imageurl 抽 data URL。失败返回 AssistantImage"
tags: [pi, ai]
---
源码：`packages/ai/src/api/openrouter-images.ts` + `openrouter-images.lazy.ts`  
懒包装：`openrouterImagesApi()` 返回 `{ generateImages: async (...) => (await import(...)).generateImages }`，不是 `lazyApi`（那是给 stream 的）。

## 本课目标

图像不是 SSE：一次非流 `chat.completions.create`，`modalities: ["image"]`，从 `message.images[].image_url` 抽 data URL。失败返回 `AssistantImages` error，不 throw。

## 在系统中的位置

```text
images.ts generateImages / ImagesModels.generateImages
  → generateImages(model, { input: Text|Image[] }, options)
      OpenAI SDK baseURL = model.baseUrl
      buildParams：单条 user，content 为 text + image_url
      modalities：output 含 text 则 ["image","text"] 否则 ["image"]
      解析 choices[0].message
```

## 解析

文本 `message.content` 字符串非空 → `TextContent`。  
`images` 里只接受 `data:` URL，正则拆 mime 和 base64。http URL 忽略（不想再去拉一张图）。

usage 与 completions 类似：input 减去 cache。cost 用 `model.cost`（生成表经常是 0）。

## 失败与边界

缺 key throw（上层 ImagesModels 会 catch 成 error 结果；compat `generateImages` 不 catch）。abort → stopReason aborted。`onPayload` 可改 params。

## 下一课

鉴权子系统从 [42-auth-types.ts.md](/series/pi-source/ai/103-auth-types-ts/) 开始。聊天请求在 `Models.applyAuth` 已经调过它。
