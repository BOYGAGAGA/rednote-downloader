# 贡献指南

感谢你对本项目的关注！欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

1. 在 [Issues](https://github.com/BOYGAGAGA/rednote-downloader/issues) 中搜索是否已有相同问题
2. 如果没有，点击 **New Issue** 选择 **Bug Report** 模板
3. 详细描述问题、复现步骤、环境信息

### 提出功能建议

1. 在 Issues 中选择 **Feature Request** 模板
2. 描述你想要的功能和使用场景

### 提交代码

```bash
# 1. Fork 本仓库

# 2. 克隆你的 Fork
git clone https://github.com/你的用户名/rednote-downloader.git
cd rednote-downloader

# 3. 创建功能分支
git checkout -b feature/你的功能

# 4. 安装依赖
npm install

# 5. 修改代码...

# 6. 提交（遵循 Conventional Commits）
git commit -m "feat: 描述你的改动"

# 7. 推送
git push origin feature/你的功能

# 8. 创建 Pull Request
```

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <description>
```

| Type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档更新 |
| style | 代码格式（不影响功能） |
| refactor | 重构 |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具变动 |

示例：
- `feat: 添加批量下载功能`
- `fix: 修复图片下载失败问题`
- `docs: 更新 README`

## 开发环境

```bash
# 克隆
git clone https://github.com/BOYGAGAGA/rednote-downloader.git
cd rednote-downloader

# 安装
npm install

# 启动（开发模式）
npm start

# 构建
npm run build
```

## 代码风格

- 使用 2 空格缩进
- 使用单引号
- 使用中文注释

## 问题？

如有疑问，欢迎在 [Issues](https://github.com/BOYGAGAGA/rednote-downloader/issues) 中提问。

---

再次感谢你的贡献！ 🙏
