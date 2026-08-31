---
layout: post
title: "DeepSeek Harness 安装使用记录"
date: 2026-08-31 16:00:00 +0800
categories: 技术
---

> 官网地址：<https://www.deepseek.com/harness/>

## 一、背景说明

- **Harness** 直译为「挽具」，在软件/编程领域指一套用于**驱动、测试、控制或运行其他代码/系统**的框架、工具或脚本层。
- **DeepSeek Harness**（`@deepseek-ai/dsh`）是 DeepSeek 官方提供的工具包，`dsh web` 子命令会启动一个本地的 Web 界面。
- 本次目标是：在本机（Windows）安装 Node.js 环境，并通过 `npx @deepseek-ai/dsh web` 启动 Harness 的 Web 界面。

---

## 二、完整安装过程

### 第 1 步：发现环境缺 Node.js

直接运行 `npx @deepseek-ai/dsh web` 报错：

```
npx : 无法将“npx”项识别为 cmdlet、函数、脚本文件或可运行程序的名称
```

检查发现系统里 **`node`、`npm`、`npx` 全部不存在**，说明本机没有安装 Node.js，而 `npx`/`npm` 都依赖它。

### 第 2 步：安装 Node.js

使用 Windows 包管理器 `winget` 安装 Node.js LTS：

```powershell
winget install --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements --silent
```

安装成功，版本为 **v24.19.0**。

> 注意：因为用了 `--scope user`，Node 被装在 winget 的 Packages 目录而非标准 `Program Files`，且安装后 **PATH 不会立即生效**，需要手动指定路径或新开终端。

Node 实际安装路径：

```
C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64\
```

临时把 Node 加入当前会话 PATH：

```powershell
$env:Path = "C:\Users\Administrator\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64;" + $env:Path
```

### 第 3 步：处理 PowerShell 执行策略

运行 `npm install` 时报错，禁止运行 `.ps1` 脚本：

```
npm : 无法加载文件 ... npm.ps1，因为在此系统上禁止运行脚本
```

原因：PowerShell 默认执行策略是 `Restricted`，不允许运行 `.ps1`。

**方案一（临时，仅当前窗口）：**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

**方案二（一劳永逸，推荐）：**

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

> `RemoteSigned` 是微软推荐的安全默认值：允许本机创建的脚本，只拦截未签名的远程下载脚本。

### 第 4 步：安装 dsh 包

执行：

```powershell
npm install -g @deepseek-ai/dsh
```

结果：

```
added 452 packages in 1m
```

安装成功。过程中出现的 `npm warn deprecated` 和 `npm warn allow-scripts` 均为**警告**，不影响安装。

> 相关警告提示有 5 个包（如 `koffi`、`node-pty` 等原生库）的 install 脚本被拦截跳过了。**但实测不影响运行**，可暂时忽略。

### 第 5 步：启动 Web 界面

```powershell
dsh web
```

**启动成功，网页正常显示。**

---

## 三、打开网页的方式

### 方式 1：PowerShell 启动后打开

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned   # 新窗口需要先执行一次
dsh web
```

启动后终端会显示一个本地地址（类似 `http://localhost:端口`），把该地址复制到浏览器打开即可。

### 方式 2：用 npx 直接启动

```powershell
npx @deepseek-ai/dsh web
```

### 方式 3：PowerShell 一行命令直接打开浏览器

```powershell
dsh web
Start-Process "http://localhost:8080"   # 端口以实际启动时显示的为准
```

---

## 四、易错提醒（踩过的坑）

1. **执行策略每次新开窗口都会重置**
   - `Set-ExecutionPolicy -Scope Process ...` 只对**当前窗口**有效，新开 PowerShell 又会回到 `Restricted`。
   - 若不想每次设置，请用 `-Scope CurrentUser -ExecutionPolicy RemoteSigned` 永久设置一次。

2. **`npm install -g --allow-scripts=包名1,包名2` 会报 ENOENT 找不到 package.json**
   - 该写法被 npm 当作"在本地目录安装项目依赖"，而当前目录没有 `package.json`。
   - 报错：`npm error path C:\Users\Administrator\package.json`。
   - 解决：先 `cd` 到某个项目目录再执行；或者**忽略这些警告**，因为实测不影响运行。

3. **`allow-scripts` 警告可以忽略**
   - 那 5 个原生包（`koffi`、`node-pty` 等）的 install 脚本虽被跳过，但包自带预编译二进制，`dsh web` 依然能正常启动。

4. **`dsh web` 是持续运行的服务**
   - 启动后终端会一直"占用"（不会退回提示符），此时不要关闭该窗口，否则网页会断开。要停止时按 `Ctrl + C`。

5. **Node 装在 winget 目录，PATH 未自动生效**
   - 新开终端如果找不到 `node`/`npm`，要么重新设置 PATH，要么重新运行一次 winget 安装让链接生效。

6. **网页正常不等于可以关窗口**
   - 网页加载成功只是浏览器侧显示，真正提供服务的是终端里那个 `dsh web` 进程，关掉窗口网页就打不开了。

7. **端口可能变化**
   - 每次启动端口不一定固定，以终端实际打印的地址为准，不要死记 8080。

---

## 五、环境信息速查

| 项目 | 值 |
| --- | --- |
| 操作系统 | Windows |
| Node.js | v24.19.0 |
| npm | 11.17.0 |
| 安装包 | @deepseek-ai/dsh（452 packages） |
| 官网 | <https://www.deepseek.com/harness/> |
