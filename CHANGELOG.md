# 📋 Changelog

本文档记录 REDNOTE DOWNLOADER 的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [2.0.0] - 2026-06-12

### ✨ 新增

- **全新 UI 设计**：深色/浅色主题切换，护眼模式
- **开机自启功能**：首次运行自动设置，页面右上角可随时关闭
- **自动连接 Edge**：复用浏览器登录状态，无需重复登录
- **正文含原链接**：保存的 TXT 文件自动写入笔记原始链接
- **一键下载全部**：图片/视频一键保存到桌面
- **右上角快捷按钮**：自启开关 + 主题切换，鼠标悬停显示说明
- **Release 打包下载**：提供 dist.zip 一键下载
- **油猴脚本**：在小红书页面直接点击下载按钮
- **axios 备用方案**：Puppeteer 失败时自动切换
- **xsec_token 支持**：自动保留 URL 验证参数

### 🐛 修复

- 修复小红书 xsec_token 验证问题（error_code: 300031）
- 修复 Puppeteer 反爬虫检测（连接 Edge 远程调试端口）
- 修复 Contributors 显示错误（Git user.name 匹配 GitHub login）
- 修复正文中特殊字符导致保存失败
- 修复图片 URL 过滤逻辑（排除头像和图标）

### 📝 文档

- 全新 README（含目录、徽章、演示、贡献指南链接）
- 添加 CONTRIBUTING.md 贡献指南（详细开发流程）
- 添加 CHANGELOG.md 更新日志（本文件）
- 添加 Issue 模板（Bug Report / Feature Request）
- 添加 GitHub Release 使用说明
- 添加油猴脚本安装和使用说明

### 🔧 技术改进

- 项目结构规范化（.github/ISSUE_TEMPLATE）
- package.json 添加 keywords、repository、bugs 字段
- .gitignore 完善（覆盖更多文件类型）
- esbuild 打包优化（external: fs, path）

---

## [1.0.0] - 2026-05-26

### ✨ 新增

- **基础功能**：解析小红书笔记内容
- **下载笔记图片**：支持多张图片下载
- **下载笔记视频**：支持视频直接下载
- **提取正文内容**：自动识别并提取文字
- **复制到剪贴板**：一键复制正文
- **保存到桌面文件夹**：自动创建文件夹，按标题命名
- **SSE 进度推送**：实时显示解析进度
- **响应式设计**：适配不同屏幕尺寸

### 🔧 技术栈

- Express.js 服务端
- Puppeteer 浏览器自动化
- 前端原生 HTML/CSS/JS

---

## [0.1.0] - 2026-05-25（内部版本）

### ✨ 新增

- 初始原型开发
- 基础解析功能验证
- UI 设计探索（v1-v5 多版本）

---

## 版本说明

### 版本号规则

```
v主版本.次版本.修订号
v2.0.0

主版本（Major）：不兼容的 API 变更
次版本（Minor）：向下兼容的功能新增
修订号（Patch）：向下兼容的问题修复
```

### 变更类型

| 类型 | 图标 | 说明 |
|------|------|------|
| 新增 | ✨ | 新功能 |
| 修复 | 🐛 | Bug 修复 |
| 文档 | 📝 | 文档更新 |
| 重构 | ♻️ | 代码重构 |
| 性能 | ⚡ | 性能优化 |
| 破坏性变更 | 💔 | 不兼容的变更 |
| 废弃 | ⚠️ | 即将移除的功能 |
| 安全 | 🔒 | 安全相关 |

---

## 链接

- [GitHub Releases](https://github.com/BOYGAGAGA/rednote-downloader/releases)
- [完整变更历史](https://github.com/BOYGAGAGA/rednote-downloader/commits/main)

---

[2.0.0]: https://github.com/BOYGAGAGA/rednote-downloader/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/BOYGAGAGA/rednote-downloader/releases/tag/v1.0.0
