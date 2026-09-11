---
title: "06 · LICENSE — MIT，无运行时作用"
summary: "确认三件事：许可证种类、版权人、和「无沙箱」产品之间的免责关系。不要在源码里找 License 检查逻辑——没有。"
tags: [pi, root]
---
源码：`LICENSE`  
被谁调用：npm 包的 `"license": "MIT"` 声明指向它；GitHub 许可证检测；再分发者。**Node 进程不读这个文件。**

## 本课目标

确认三件事：许可证种类、版权人、和「无沙箱」产品之间的免责关系。不要在源码里找 License 检查逻辑——没有。

## 在仓库中的位置

仓库根一份 MIT。各包 `package.json` 写 `"license": "MIT"`，发布到 npm 的 tarball 会把根 LICENSE 或包内副本打进去（以各包 `files` 字段为准）。独立二进制的 `build-binaries.sh` 还会把 coding-agent 的 README / CHANGELOG 拷进发布目录，许可证随源码 archive 走。

版权行：`Copyright (c) 2025 Mario Zechner`。这是个人版权，不是 Earendil 公司名。SECURITY.md 的报告邮箱却是 `security@earendil.com`，README 指向 earendil-works GitHub org——法律实体和托管组织可以不同，报安全和谈再分发时分别看。

## 文件做什么

标准 MIT 三段：

1. 允许使用、复制、修改、合并、发布、分发、再许可、出售。
2. 条件：副本必须保留版权声明和许可声明。
3. 免责：按现状提供，无品质担保；作者对损害不承担责任。

没有 CLA、没有附加 Commons Clause、没有「不可用于训练模型」之类的额外条款。OSS session 分享（README 里的 Hugging Face）是请求，不是许可限制。

## 关键逻辑

MIT 的「AS IS」和 SECURITY.md 的「本地用户边界」是对同一风险的两个层面：

- 法律：软件造成数据丢失、账单、泄露，作者在许可范围内免责。
- 产品：工具按设计就能执行任意命令，用户要自己容器化。

失败会怎样：再分发时丢掉 LICENSE 正文，违反唯一条件。把 Pi 嵌进商业产品是允许的；不需要向作者付费。若有人把根 LICENSE 改成更严的协议，所有已发布 npm 版本仍受当时的 MIT 约束，新版本才走新协议——所以改许可证是发版级决策，不是格式化。

## 和启动链的关系

无。`pi --version` 不会打印许可证。TUI 里也没有 license 屏。

## 下一课

工具链配置从 biome 开始：[07-biome.json.md](/series/pi-source/root/011-biome-json/)。
