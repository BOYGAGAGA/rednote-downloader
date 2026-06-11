<div align="center">

# 🔴 REDNOTE DOWNLOADER

**小红书内容下载器**

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)]()

下载图片 · 提取正文 · 一键保存 · 开机自启

</div>

---

## ✨ 功能特性

- 📷 **下载笔记图片** — 高清无水印
- 🎬 **下载笔记视频** — 直接保存到本地
- 📝 **提取正文内容** — 自动保存为 TXT
- 📋 **一键复制文本** — 快速复制到剪贴板
- 🚀 **开机自启** — 可随时在页面关闭
- 🌙 **深色/浅色主题** — 护眼切换
- 🔗 **自动复用登录** — 连接 Edge 浏览器

## 📦 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) v16+
- [Microsoft Edge](https://www.microsoft.com/edge) 浏览器

### 安装运行

```bash
# 克隆项目
git clone https://github.com/BOYGAGAGA/rednote-downloader.git
cd rednote-downloader

# 安装依赖
npm install

# 启动服务
npm start
```

### 使用打包版本（推荐）

1. 下载 [dist.zip](https://github.com/BOYGAGAGA/rednote-downloader/releases)
2. 解压后双击 `start.bat` 即可运行

## 🚀 使用方法

1. 启动后 Edge 浏览器自动打开
2. **在 Edge 中登录小红书账号**
3. 访问 http://localhost:3000
4. 粘贴小红书笔记链接
5. 点击 **解析** → 查看/下载内容

## ⚙️ 开机自启

| 操作 | 说明 |
|------|------|
| 首次运行 | 自动设置开机自启 |
| 页面右上角 | 点击 ⏰ 图标开关自启 |
| 命令行 | `node standalone-server.js --no-autostart` |

## 📁 项目结构

```
rednote-downloader/
├── standalone-server.js    # 服务端源码
├── index.html              # 前端页面
├── start.bat               # Windows 启动脚本
├── start.vbs               # 静默后台启动
├── package.json            # 项目配置
└── dist/
    ├── rednote-downloader.min.js  # 打包版本
    └── index.html                 # 前端副本
```

## ⚠️ 注意事项

- 需要登录小红书账号才能正常解析
- 请保持 Edge 浏览器不要关闭
- 仅用于个人学习研究，请勿用于商业用途

## 📄 License

[MIT](LICENSE) © [BOYGAGA](https://github.com/BOYGAGAGA)

---

<div align="center">

**如果觉得有用，请给个 ⭐ Star 支持一下！**

</div>
