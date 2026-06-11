# 🤝 贡献指南

感谢你对 REDNOTE DOWNLOADER 的关注！欢迎任何形式的贡献。

## 📖 目录

- [如何贡献](#-如何贡献)
- [报告 Bug](#-报告-bug)
- [提出功能建议](#-提出功能建议)
- [提交代码](#-提交代码)
- [开发环境](#-开发环境)
- [项目结构](#-项目结构)
- [提交规范](#-提交规范)
- [代码风格](#-代码风格)
- [Pull Request 流程](#-pull-request-流程)
- [常见问题](#-常见问题)

---

## 🎯 如何贡献

你可以通过以下方式为项目做出贡献：

| 方式 | 说明 |
|------|------|
| 🐛 报告 Bug | 发现问题请提交 Issue |
| 💡 功能建议 | 有好想法请提交 Feature Request |
| 📝 文档改进 | 帮助完善 README 或其他文档 |
| 🔧 代码贡献 | 修复 Bug 或实现新功能 |
| ⭐ Star | 给项目点个 Star 也是一种支持 |

---

## 🐛 报告 Bug

### 前提检查

在提交 Bug 报告前，请先确认：

- [ ] 已阅读 [README](https://github.com/BOYGAGAGA/rednote-downloader#readme) 中的注意事项
- [ ] 已确认 Edge 浏览器已登录小红书
- [ ] 已确认服务器正在运行
- [ ] 已尝试重启服务器
- [ ] 已搜索 [Issues](https://github.com/BOYGAGAGA/rednote-downloader/issues) 确认没有相同问题

### 提交步骤

1. 前往 [Issues](https://github.com/BOYGAGAGA/rednote-downloader/issues/new?template=bug_report.md)
2. 选择 **Bug Report** 模板
3. 详细填写所有信息，特别是：
   - 复现步骤
   - 环境信息
   - 控制台日志
4. 提交 Issue

---

## 💡 提出功能建议

### 提交步骤

1. 前往 [Issues](https://github.com/BOYGAGAGA/rednote-downloader/issues/new?template=feature_request.md)
2. 选择 **Feature Request** 模板
3. 详细描述：
   - 你想要什么功能
   - 为什么需要这个功能
   - 你期望的实现方式

---

## 🔧 提交代码

### Fork & Clone

```bash
# 1. Fork 本仓库（点击右上角 Fork 按钮）

# 2. 克隆你的 Fork
git clone https://github.com/你的用户名/rednote-downloader.git
cd rednote-downloader

# 3. 添加上游仓库
git remote add upstream https://github.com/BOYGAGAGA/rednote-downloader.git
```

### 创建分支

```bash
# 从 main 分支创建新分支
git checkout main
git pull upstream main
git checkout -b feature/你的功能名
```

### 开发 & 提交

```bash
# 修改代码...

# 添加文件
git add .

# 提交（遵循 Conventional Commits）
git commit -m "feat: 添加xxx功能"

# 推送到你的 Fork
git push origin feature/你的功能名
```

### 创建 Pull Request

1. 前往你的 Fork 页面
2. 点击 **Compare & pull request**
3. 填写 PR 描述，说明：
   - 做了什么改动
   - 为什么做这个改动
   - 如何测试
4. 等待 Review

---

## 🛠️ 开发环境

### 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | v16+ | 运行环境 |
| npm | v8+ | 包管理器 |
| Git | 最新版 | 版本控制 |
| Microsoft Edge | 最新版 | 浏览器自动化 |

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/BOYGAGAGA/rednote-downloader.git
cd rednote-downloader

# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建打包版本
npm run build
```

### 开发调试

```bash
# 启动后访问
http://localhost:3000

# 查看控制台日志
# 服务器日志会输出在终端
```

---

## 📁 项目结构

```
rednote-downloader/
├── .github/
│   └── ISSUE_TEMPLATE/           # Issue 模板
│       ├── bug_report.md         # Bug 报告模板
│       └── feature_request.md    # 功能建议模板
├── standalone-server.js          # 服务端源码（核心）
├── index.html                    # 前端页面
├── rednote-downloader.user.js    # 油猴脚本
├── start.bat                     # Windows 启动脚本
├── start.vbs                     # 静默后台启动
├── package.json                  # 项目配置
├── .gitignore                    # Git 忽略规则
├── LICENSE                       # MIT 开源协议
├── README.md                     # 项目说明
├── CONTRIBUTING.md               # 贡献指南（本文件）
└── CHANGELOG.md                  # 更新日志
```

### 核心文件说明

| 文件 | 说明 |
|------|------|
| `standalone-server.js` | 服务端主文件，包含 Express 服务器、Puppeteer 自动化、API 接口 |
| `index.html` | 前端页面，包含 UI 和交互逻辑 |
| `rednote-downloader.user.js` | 油猴脚本，在小红书页面注入下载按钮 |

---

## 📝 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加批量下载功能` |
| `fix` | 修复 Bug | `fix: 修复图片下载失败问题` |
| `docs` | 文档更新 | `docs: 更新 README 安装说明` |
| `style` | 代码格式（不影响功能） | `style: 格式化代码缩进` |
| `refactor` | 重构 | `refactor: 重构图片下载逻辑` |
| `perf` | 性能优化 | `perf: 优化页面加载速度` |
| `test` | 测试相关 | `test: 添加单元测试` |
| `chore` | 构建/工具变动 | `chore: 更新依赖版本` |
| `ci` | CI/CD 相关 | `ci: 添加 GitHub Actions` |

### 提交示例

```bash
# 好的提交
git commit -m "feat: 添加视频下载功能"
git commit -m "fix: 修复xsec_token验证失败问题"
git commit -m "docs: 添加油猴脚本安装说明"

# 不好的提交
git commit -m "更新代码"
git commit -m "fix bug"
git commit -m "改了一下"
```

---

## 🎨 代码风格

### JavaScript

```javascript
// ✅ 好的写法
const noteId = extractNoteId(url);
if (!noteId) {
  return res.status(400).json({ error: '无法提取笔记ID' });
}

// ❌ 不好的写法
var noteId = extractNoteId(url)
if(!noteId) return res.status(400).json({error:'无法提取笔记ID'})
```

### 规则

| 项目 | 规则 |
|------|------|
| 缩进 | 2 空格 |
| 引号 | 单引号 `'` |
| 分号 | 必须添加 |
| 变量 | 优先使用 `const`，其次 `let` |
| 注释 | 使用中文注释关键逻辑 |
| 命名 | 使用 camelCase |

---

## 🔄 Pull Request 流程

### PR 检查清单

提交 PR 前请确认：

- [ ] 代码遵循项目代码风格
- [ ] 已测试功能正常
- [ ] 已更新相关文档（如有必要）
- [ ] 提交信息遵循 Conventional Commits
- [ ] 没有引入新的依赖（如有必要请说明）
- [ ] 没有泄露敏感信息

### PR 描述模板

```markdown
## 改动说明

<!-- 简要描述做了什么改动 -->

## 改动原因

<!-- 为什么要做这个改动 -->

## 测试方法

<!-- 如何测试这个改动 -->

1. 运行 `npm start`
2. 访问 http://localhost:3000
3. 测试 xxx 功能

## 截图（如有UI改动）

<!-- 拖拽截图到此处 -->

## 相关 Issue

<!-- 关联的 Issue 编号 -->

Closes #xxx
```

### Review 流程

1. 提交 PR 后会自动触发 CI 检查
2. 维护者会 Review 代码
3. 如有修改意见，请及时处理
4. Review 通过后会合并到 main 分支

---

## ❓ 常见问题

### Q: 推送失败怎么办？

```bash
# 检查远程仓库配置
git remote -v

# 如果没有 upstream，添加上游仓库
git remote add upstream https://github.com/BOYGAGAGA/rednote-downloader.git

# 拉取最新代码
git pull upstream main
```

### Q: 如何同步上游代码？

```bash
# 拉取上游最新代码
git fetch upstream

# 合并到本地 main 分支
git checkout main
git merge upstream main

# 推送到你的 Fork
git push origin main
```

### Q: 如何撤销上一次提交？

```bash
# 撤销提交但保留修改
git reset --soft HEAD~1

# 撤销提交并丢弃修改
git reset --hard HEAD~1
```

### Q: 如何解决冲突？

```bash
# 拉取最新代码
git pull upstream main

# 如果有冲突，手动解决后
git add .
git commit -m "merge: 解决合并冲突"
```

---

## 📞 联系方式

如有疑问，欢迎通过以下方式联系：

- [GitHub Issues](https://github.com/BOYGAGAGA/rednote-downloader/issues)
- [GitHub Discussions](https://github.com/BOYGAGAGA/rednote-downloader/discussions)

---

## 🙏 致谢

感谢所有为项目做出贡献的人！

[![Contributors](https://contrib.rocks/image?repo=BOYGAGAGA/rednote-downloader)](https://github.com/BOYGAGAGA/rednote-downloader/graphs/contributors)

---

再次感谢你的贡献！ ❤️
