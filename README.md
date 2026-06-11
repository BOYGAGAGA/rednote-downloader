<div align="center">

# 🔴 REDNOTE DOWNLOADER

**小红书内容下载器 — 下载图片、视频，提取正文**

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg)](https://github.com/BOYGAGAGA/rednote-downloader/releases)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Stars](https://img.shields.io/github/stars/BOYGAGAGA/rednote-downloader.svg)](https://github.com/BOYGAGAGA/rednote-downloader/stargazers)

📷 下载图片 · 🎬 下载视频 · 📝 提取正文 · 🚀 开机自启

</div>

---

## 📖 目录

- [功能特性](#-功能特性)
- [快速开始](#-快速开始)
- [使用方法](#-使用方法)
- [开机自启](#-开机自启)
- [项目结构](#-项目结构)
- [更新日志](#-更新日志)
- [贡献指南](#-贡献指南)
- [License](#-license)

---

## ✨ 功能特性

- 📷 **下载笔记图片** — 高清无水印，一键保存
- 🎬 **下载笔记视频** — 直接下载到本地
- 📝 **提取正文内容** — 自动保存为 TXT，含原链接
- 📋 **一键复制文本** — 快速复制到剪贴板
- 🚀 **开机自启** — 页面右上角可随时关闭
- 🌙 **深色/浅色主题** — 护眼切换
- 🔗 **自动复用登录** — 连接 Edge 浏览器，无需重复登录

## 📸 演示

```
┌─────────────────────────────────────┐
│  🔴 REDNOTE DOWNLOADER        ⏰ 🌙 │
│                                     │
│  ┌─────────────────────────┐        │
│  │ 粘贴小红书链接...    解析 │        │
│  └─────────────────────────┘        │
│                                     │
│  ┌─────────────────────────┐        │
│  │ 📷 图片1  📷 图片2  📷 图片3│    │
│  └─────────────────────────┘        │
│  标题: xxxxxx                        │
│  作者: @xxxxxx                       │
│  正文: xxxxxxxxxx                    │
│  ┌─────────────────────────┐        │
│  │      📥 一键下载全部      │        │
│  └─────────────────────────┘        │
└─────────────────────────────────────┘
```

## 📦 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) v16+
- [Microsoft Edge](https://www.microsoft.com/edge) 浏览器

### 方式一：下载 Release（推荐）

1. 前往 [Releases](https://github.com/BOYGAGAGA/rednote-downloader/releases/latest) 页面
2. 下载 `dist.zip`
3. 解压后双击 `start.bat` 即可

### 方式二：源码运行

```bash
# 克隆项目
git clone https://github.com/BOYGAGAGA/rednote-downloader.git
cd rednote-downloader

# 安装依赖
npm install

# 启动
npm start
```

## 🚀 使用方法

1. 启动后 Edge 浏览器会自动打开
2. **在 Edge 中登录小红书账号**（首次需要）
3. 访问 http://localhost:3000
4. 粘贴小红书笔记链接，点击 **解析**
5. 查看内容、下载图片/视频

### 注意事项

- ⚠️ 需要登录小红书账号才能正常解析
- ⚠️ 请保持 Edge 浏览器不要关闭
- ⚠️ 首次使用需要在自动打开的 Edge 中登录

## ⚙️ 开机自启

| 操作 | 说明 |
|------|------|
| 首次运行 `start.bat` | 自动设置开机自启 |
| 页面右上角 ⏰ 图标 | 点击开关自启 |
| 命令行 | `node standalone-server.js --no-autostart` |

## 📁 项目结构

```
rednote-downloader/
├── .github/
│   └── ISSUE_TEMPLATE/       # Issue 模板
│       ├── bug_report.md
│       └── feature_request.md
├── standalone-server.js      # 服务端源码
├── index.html                # 前端页面
├── start.bat                 # Windows 启动脚本
├── start.vbs                 # 静默后台启动
├── package.json              # 项目配置
├── .gitignore
├── LICENSE
├── README.md
├── CONTRIBUTING.md           # 贡献指南
└── CHANGELOG.md              # 更新日志
```

## 📋 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)

### v2.0.0 (2026-06-12)
- ✨ 全新 UI 设计
- ✨ 开机自启功能（可关闭）
- ✨ 深色/浅色主题
- ✨ 自动连接 Edge 复用登录
- ✨ 正文含原链接
- ✨ 一键下载全部图片/视频

## 🤝 贡献指南

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'feat: add xxx'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 创建 Pull Request

## 📄 License

[MIT](LICENSE) © [BOYGAGA](https://github.com/BOYGAGAGA)

---

<div align="center">

**如果觉得有用，请给个 ⭐ Star！**

</div>
