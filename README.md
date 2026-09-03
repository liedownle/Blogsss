# 我的学习博客

一个基于 **GitHub Pages + Jekyll** 的个人学习博客，支持**博文加密**（AES 真加密）功能。

- 站点地址：`https://liedownle.github.io/Blogsss/`
- 代码仓库：`https://github.com/liedownle/Blogsss`
- 更新方式：写好博文 → `git push` → GitHub Actions 自动构建部署 → 1~2 分钟生效

---

## 一、网站方案与细节

### 1.1 技术栈

| 组件 | 作用 |
|---|---|
| **Jekyll** | 静态网站生成器，把 Markdown 渲染成 HTML |
| **GitHub Pages** | 免费托管网站 |
| **GitHub Actions** | 每次推送代码后自动构建 + 加密 + 部署 |
| **crypto-js + Node crypto** | 博文加密/解密（AES-256-CBC） |

### 1.2 目录结构

```
myblog/
├── _config.yml                    # 博客全局配置（改标题、作者、地址等）
├── Gemfile                        # Jekyll 依赖（构建用，一般不用动）
├── index.md                       # 首页（文章列表，一般不用动）
├── about.md                       # 关于页
├── friends.md                     # 友情链接页（加/删好友改这里）
├── 404.html                       # 404 错误页
├── README.md                      # 本说明文档
├── 操作手册.md                    # 日常操作速查手册（推荐看这个）
├── _posts/                        # ★ 博文目录，写文章放这里
│   ├── 2026-08-27-sky-daily-task.md    # 加密博文示例（光遇笔记）
│   ├── 2026-08-28-hello-world.md       # 公开博文示例
│   └── 2026-08-28-secret-notes.md      # 加密博文示例
├── _layouts/                      # 页面布局模板（一般不用动）
├── _includes/                     # 复用组件（导航、页脚等，一般不用动）
├── assets/
│   ├── css/style.css              # 全站样式
│   ├── js/encrypt.js              # 前端解密脚本
│   └── images/                    # ★ 放图片的地方
├── scripts/encrypt.js             # 构建时加密脚本（不要动）
└── .github/workflows/
    └── jekyll-gh-pages.yml        # 自动构建部署配置（不要动）
```

> **你日常只需要关心 4 个地方**：`_posts/`（写文章）、`assets/images/`（放图片）、`_config.yml`（改配置）、`friends.md`（偶尔加/删友链）。

### 1.3 加密原理（博文加密功能）

**你**（写博客的人）：
1. 在文章头部加一行 `encrypted: true` 标记加密
2. 正常写正文

**构建时**（GitHub Actions 云端）：
1. Jekyll 先把正文渲染成 HTML
2. 加密脚本用 **AES-256-CBC** 把正文加密成密文
3. 密钥来自 **GitHub Secrets**（`BLOG_SECRET_KEY`），**不出现在任何代码/仓库里**

**访客**（看博客的人）：
1. 点开加密博文 → 弹出密码框
2. 输入正确密码 → 前端用 crypto-js 解密 → 显示正文
3. 密码错误 → 提示"密码错误，请重试"

**安全特点：**
- ✅ 仓库源码里只有密文，没有明文
- ✅ 密钥存在 GitHub Secrets，代码里找不到
- ⚠️ **注意**：GitHub Pages 免费版要求**公开仓库**。虽然加密了，但密文本身在公开仓库里。技术高手理论上可以拿密文暴力破解。**真正敏感的内容不要放上来**，这个加密适合"防一般访客/搜索引擎"，不适合存储机密。

---

## 二、日常发布新博文（步骤 + 注意事项）

### 2.1 发布一篇新文章的完整步骤

**第 1 步：写文章**
在 `_posts/` 目录新建 Markdown 文件，文件名格式必须是：
```
年-月-日-英文或中文标题.md
```
例如：`2026-08-28-我的第一篇.md`

**第 2 步：写文件内容（头部模板）**

```markdown
---
layout: post
title: "文章的标题"
date: 2026-08-28 10:00:00 +0800
categories: 分类名
# 想加密就加下面这一行，不加密就不写
encrypted: true
---

这里是正文……用 Markdown 写。
```

**第 3 步：提交并推送**

在 `myblog` 目录打开终端：

```bash
git add .
git commit -m "add post: 标题"
git push
```

**第 4 步：等待部署**
推送后 1~2 分钟，GitHub Actions 自动构建部署。打开仓库 **Actions** 页，绿色 ✓ 即成功。刷新博客即可看到新文章。

### 2.2 注意事项（务必阅读）

#### ⚠️ 1. 路径前缀（最容易出错）
因为博客部署在子路径 `/Blogsss` 下，**文章里引用图片/文件/链接，必须以 `/Blogsss/` 开头**：

```markdown
✅ 正确：![图](/Blogsss/assets/images/1.png)
❌ 错误：![图](/assets/images/1.png)   ← 会 404
```

图片要放到 `assets/images/` 文件夹里再引用。

#### ⚠️ 2. commit 用英文，避免 Windows 乱码
Windows 的 PowerShell 用中文 commit 信息容易报错，**建议用简短英文**，如 `add post: xxx`、`fix: xxx`。

#### ⚠️ 3. 公开仓库，别放敏感内容
仓库是公开的。**任何不想公开的东西（密码、账号、私密信息）都不要写进文章或代码**。想设密阅读就用 `encrypted: true`，但也只是防普通访客。

#### ⚠️ 4. 文件名和日期格式
- 文件名必须 `YYYY-MM-DD-标题.md`，否则 Jekyll 不识别为文章
- `date` 要写北京时间 `+0800`

#### ⚠️ 5. 改了加密密码要重新触发构建
如果你改了 `BLOG_SECRET_KEY`，需要重新推送一次（改任何文件再 push），让 Actions 重新构建，才能用新密码解锁。

#### ⚠️ 6. 别改 `_config.yml` 里的 baseurl
`baseurl: "/Blogsss"` 千万别改，改错整个网站路径会全挂（图片、样式、链接全 404）。

#### ⚠️ 7. 网络问题
推送时如果报 `Failed to connect to github.com`，通常是网络波动，过一会儿重试 `git push` 即可。

---

## 三、部署配置速查（已配置好，一般不用改）

以下配置在首次建站时已完成，**除非重装/迁移，否则不需要再动**：

| 配置项 | 位置 | 说明 |
|---|---|---|
| 加密密钥 | GitHub 仓库 Settings → Secrets → `BLOG_SECRET_KEY` | 访客解锁加密博文的密码 |
| GitHub Pages | GitHub 仓库 Settings → Pages → Source 选 `GitHub Actions` | 必须是 GitHub Actions 发布方式 |
| baseurl | `_config.yml` | `/Blogsss`，子路径前缀 |

---

## 四、补充说明（你可能没注意到的点）

1. **`_site` 目录**：Jekyll 构建输出目录，`gitignore` 已排除，**不需要也不应该提交**到仓库。
2. **本地预览**：如果本机装 Ruby，可运行 `bundle exec jekyll serve` 在 `http://localhost:4000/Blogsss/` 预览。不装也不影响发布（GitHub 云端自动构建）。
3. **关于页**：`about.md` 可改成你的介绍。
4. **加密文章共用同一密码**：所有 `encrypted: true` 的文章都用同一个 `BLOG_SECRET_KEY`，无法每篇单独设密码。
5. **图片外链**：也可以引用外网图片链接（`https://...`），不受子路径影响。
6. **更新频率**：每次 `git push` 都会触发一次构建，构建约 30~60 秒。频繁小改动会累积构建次数（免费额度内无影响）。
7. **友链页**：`friends.md` 是"友情链接"页面，新增/删除朋友的操作步骤见 `操作手册.md` 第五章。

---

## 五、常见问题

| 问题 | 解决办法 |
|---|---|
| 推完网站没更新 | 看 Actions 是否失败；确认推送分支是 `main` |
| 图片 404 | 路径是否带 `/Blogsss/` 前缀；图片是否真的在 `assets/images/` |
| 加密文章打不开/乱码 | 密码是否正确；确认 Secrets 里设了 `BLOG_SECRET_KEY` |
| 想改加密密码 | 改 Secrets 的 `BLOG_SECRET_KEY`，再重新 push 触发构建 |
| 中文 commit 报错 | 改用英文 commit 信息 |

---

*最后更新：2026-09-03*
