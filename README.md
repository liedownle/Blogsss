# 我的学习博客（GitHub Pages + Jekyll + 博文加密）

一个基于 GitHub Pages 的个人博客，支持**加密博文**功能：
- 普通博文公开可见
- 加密博文需输入密码才能查看（真正的 AES 加密，不是假遮挡）

## 目录结构

```
myblog/
├── _config.yml              # 博客配置
├── Gemfile                  # Jekyll 依赖
├── index.md                 # 首页（文章列表）
├── about.md                 # 关于页
├── _posts/                  # 博文（Markdown）
│   ├── 2026-08-28-hello-world.md    # 公开博文
│   └── 2026-08-28-secret-notes.md   # 加密博文（encrypted: true）
├── _layouts/                # 页面布局模板
├── _includes/               # 复用组件（导航、页脚等）
├── assets/                  # CSS 和 JS
├── scripts/encrypt.js       # 构建时加密脚本（Node）
└── .github/workflows/       # GitHub Actions 自动构建部署
```

## 如何发布博客

### 第 1 步：创建 GitHub 仓库
1. 登录 [github.com](https://github.com)
2. 右上角 `+` → **New repository**
3. 仓库名填：`Blogsss`（你的仓库名）
4. 选择 **Public**，点击 **Create repository**

### 第 2 步：把本地代码上传到仓库
打开终端，进入本项目目录 `myblog`，执行：

```bash
# 初始化 git（若还没做过）
git init

# 关联远程仓库（改成你自己的地址）
git remote add origin https://github.com/liedownle/Blogsss.git

# 添加并提交
git add .
git commit -m "初始化博客"

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 第 3 步：设置加密密钥（Secrets）
1. 打开仓库 → **Settings** → 左侧 **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. **Name** 填：`BLOG_SECRET_KEY`
4. **Secret** 填：你自己的密码（这就是访客解锁加密博文要输入的密码）
5. 点击 **Add secret**

### 第 4 步：启用 GitHub Pages
1. 仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选择 `GitHub Actions`
3. 保存（工作流文件已配置好，会自动构建）

### 第 5 步：等待部署
推代码后，打开仓库 → **Actions** 标签页，可以看到构建任务自动运行。
等绿色 ✓ 出现，访问 `https://liedownle.github.io/Blogsss/` 即可看到博客（仓库名是 Blogsss，所以地址带这个子路径）。

---

## 如何写一篇加密博文

在 `_posts/` 目录新建 Markdown 文件，文件名格式：`YYYY-MM-DD-标题.md`

**公开博文：** 什么都不用加，正常写。

**加密博文：** 在文件头部 frontmatter 中加一行：

```markdown
---
layout: post
title: "私密笔记"
date: 2026-08-28 11:00:00 +0800
encrypted: true        # ← 加上这一行就是加密博文
---

这里写正文，构建时会被加密，仓库里看不到明文。
```

**注意：**
- 所有加密博文共用同一个密码（`BLOG_SECRET_KEY`）
- 修改 `BLOG_SECRET_KEY` 后需要重新构建才能更新所有加密博文
- 加密博文的正文在**构建后**才加密，GitHub 云端运行时可见（构建时读取），不会进入仓库历史（因为构建产物 `_site` 不上传）

## 本地预览（可选，需要装 Ruby）

如果本机装了 Ruby：

```bash
bundle install
bundle exec jekyll serve
# 访问 http://localhost:4000
```

## 安全性说明

- 加密使用 **AES-256-CBC**，密钥通过 GitHub Secrets 注入，**不会出现在仓库代码中**
- 访客端用 **crypto-js** 解密，输入正确密码才能看到正文
- 该方案适合保护一般私密内容。**如需最高安全等级，建议敏感内容不要放在公开仓库**（GitHub Pages 免费版只支持公开仓库）
