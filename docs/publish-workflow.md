# 发布指南：从「想学一个新知识」到「网站上看到它」

> 全程约 10 分钟（不含 AI 生成时间）。不需要懂后端，不需要碰服务器。

---

## 前提：一次性准备

1. 本项目已推送到你的 GitHub 仓库；
2. 电脑装好 Node.js ≥22 和 npm。

## 完整流程

### 第 1 步 · 规划课程（5 分钟）

1. 打开网站 `/prompts/` 页面（或本地 `prompts/01-series-architect.md`），复制「系列规划师」提示词；
2. 粘贴到大模型（DeepSeek / Kimi / ChatGPT 都行），把 `{主题}` 换成你想学的知识；
3. 拿到 JSON 大纲后**保存下来**，比如存成 `大纲-我的主题.json`。

### 第 2 步 · 创建系列骨架（1 分钟）

```bash
cd Project/stepwell

# 创建全新系列（会交互式问你几个问题）
npm run new:chapter -- my-topic --new
```

编辑 `content/series/my-topic/_meta.md`：
- 把规划师输出的 `title/sub/intro/category/level/phases` 抄进去；
- `phases` 的 `slugPrefix` 按大纲章节编号填（如第一卷含 00~04 讲就填 `"0"`）。

### 第 3 步 · 逐章生成正文（AI 干活，你把关）

1. 复制 `prompts/02-chapter-writer.md`（章节写作者）；
2. 附上大纲 JSON + 讲次编号，让 AI 写出完整 Markdown；
3. 把内容存到 `content/series/my-topic/03-xxx.md`（文件名按大纲 slug）；
4. **每章都用 `prompts/03-chapter-reviewer.md`（审校员）过一遍**，按建议修改。

> 建议：每次生成 1~2 章，质量最高。全部生成完再进入下一步。

### 第 4 步 · 本地预览确认（2 分钟）

```bash
npm run dev
```

浏览器打开 `http://localhost:4321`：
- 书架上能看到新书 → 目录页分卷正确 → 点开一两章看排版；
- 没问题就 `Ctrl+C` 停掉。

### 第 5 步 · 发布上线（1 分钟）

```bash
git add .
git commit -m "feat: 新增《我的主题》系列"
git push
```

push 之后：
- GitHub Actions 自动构建验证（`.github/workflows/ci.yml`）；
- 部署平台自动拉取并发布（第一期用 Netlify；接腾讯云后见 deploy-tencent.md）。

约 1~3 分钟后刷新网站即可看到新课上线。🎉

---

## 日常追加一讲

```bash
npm run new:chapter -- my-topic   # 交互式生成下一讲模板
# 用写作者提示词生成内容 → 填入文件 → git push
```

## 加订阅源（RSS 广场）

编辑 `src/data/feeds.yaml` 加一条，push 即可。GitHub Actions 每天早上 8 点自动抓取更新。

## 常见问题

| 问题 | 处理 |
|---|---|
| build 报 frontmatter 校验错 | 对照 docs/content-spec.md 检查字段名和类型 |
| 新书没出现在书架 | `_meta.md` 里 `draft: true` 了？category 是否合法？ |
| 页面顺序乱了 | 章节顺序由**文件名数字前缀**决定，检查命名 |
| CI 挂了 | 打开 GitHub 仓库 Actions 标签页看红叉日志，通常是 markdown 格式问题 |
