# REDNOTE DOWNLOADER

小红书内容下载器 - 下载图片、视频，复制正文内容

## 功能

- 📷 下载笔记图片
- 🎬 下载笔记视频
- 📝 提取正文内容
- 📋 一键复制文本
- 🚀 开机自启（可关闭）
- 🌙 深色/浅色主题

## 使用前提

1. 安装 [Node.js](https://nodejs.org/)（v16+）
2. 安装 [Microsoft Edge](https://www.microsoft.com/edge) 浏览器

## 快速开始

### 方式一：直接运行

```bash
# 克隆项目
git clone https://github.com/BOYGAGAGA/rednote-downloader.git
cd rednote-downloader

# 安装依赖
npm install

# 启动
npm start
```

### 方式二：使用打包版本

1. 下载 `dist/rednote-downloader.min.js` 和 `index.html`
2. 放到同一目录
3. 运行：`node rednote-downloader.min.js`

## 使用方法

1. 启动后 Edge 浏览器会自动打开
2. **在 Edge 中登录小红书账号**
3. 访问 http://localhost:3000
4. 粘贴小红书笔记链接，点击解析
5. 查看内容、下载图片/视频

## 开机自启

- 首次运行会自动设置开机自启
- 页面右上角有时钟图标，点击可开关自启

## 静默运行

使用 `启动器.vbs` 可以后台静默运行（无命令行窗口）

## 注意事项

- 需要登录小红书账号才能正常解析
- 仅用于个人学习研究，请勿用于商业用途

## License

MIT

---

by [BOYGAGA](https://github.com/BOYGAGAGA)
