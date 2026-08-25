# 腾讯云部署预案（第二期执行）

> 现状：第一期网站部署在免费托管平台（Netlify），零成本零运维。
> 本文档记录接入你的腾讯云服务器（2C4G，1panel 管理）的完整预案，届时照着做即可。

---

## 目标架构（第二期）

```
GitHub push
   │
   ▼
GitHub Actions 构建（npm run build）
   │
   ├── 静态站 dist/ ──→ rsync/scp 上传到腾讯云 ──→ 1panel/OpenResty 托管
   │                                              你的域名 HTTPS
   └── （可选）Node.js 后端 ──→ 同步阅读进度、服务端 RSS
```

## 方案 A：纯静态托管（最简单，推荐先做）

服务器只当"高级网盘"，跑现有静态站：

1. **域名与备案**：域名解析到服务器 IP；国内服务器需 ICP 备案；
2. **1panel 建站**：应用商店装 OpenResty → 创建静态网站 → 指向 `/opt/stepwell/dist`；
3. **HTTPS**：1panel 内置 acme.sh 一键申请 Let's Encrypt 证书，自动续期；
4. **自动发布**：新增 GitHub Actions job，构建后用 `appleboy/scp-action` 上传 dist：
   ```yaml
   - name: 上传到腾讯云
     uses: appleboy/scp-action@v1
     with:
       host: ${{ secrets.SERVER_HOST }}
       username: ${{ secrets.SERVER_USER }}
       key: ${{ secrets.SSH_KEY }}
       source: "dist/*"
       target: /opt/stepwell/
       strip_components: 1
   ```
5. 在 GitHub 仓库 Settings → Secrets 配置上面三个密钥。

## 方案 B：加 Node.js 同步后端（进阶）

在方案 A 基础上增加：

- **进度同步**：实现 storage.ts 预留的 SYNC_ENDPOINT 接口——
  `POST /sync` 上传本地 progress/activity JSON，`GET /sync` 拉取合并。
  数据存 SQLite（单文件，1panel 可视化管理），一个 200 行的 Express/Hono 应用足够；
- **服务端 RSS**：把 fetch-feeds.mjs 挪到服务器定时跑（1panel 计划任务），
  网站改为运行时请求接口获取最新内容；
- **进程守护**：pm2 或 systemd 托管 Node 进程。

## 迁移时的检查单

- [ ] astro.config.mjs 的 `SITE` 改为真实域名
- [ ] DNS 解析 + 备案完成
- [ ] HTTPS 证书生效且自动续期
- [ ] GitHub Actions secrets 配置完毕
- [ ] 旧平台（Netlify）设置跳转或下线
- [ ] 手机 PWA「添加到主屏幕」重新验证

## 为什么第一期不直接上服务器？

静态托管平台免费、自带全球 CDN 和自动 HTTPS、push 即上线。等网站稳定使用、
确实需要"跨设备同步/服务端能力"时再迁移，学习曲线平缓，且架构已预留接缝，
迁移只是改配置不动代码。
