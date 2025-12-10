# GitHub 和 Vercel 部署指南

## 步骤 1: 创建 GitHub 仓库

### 方法一：通过 GitHub 网站创建

1. 前往 [GitHub](https://github.com) 并登录
2. 点击右上角的 **+** 按钮，选择 **New repository**
3. 填写仓库信息：
   - **Repository name**: `secure-lesson-app`（或您喜欢的名称）
   - **Description**: `Secure AI Learning Platform with Supabase Authentication`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（因为我们已经有了代码）
4. 点击 **Create repository**

### 方法二：使用 GitHub CLI（如果已安装）

```bash
gh repo create secure-lesson-app --public --source=. --remote=origin --push
```

---

## 步骤 2: 连接本地仓库到 GitHub

创建仓库后，GitHub 会显示仓库 URL，类似：
```
https://github.com/YOUR_USERNAME/secure-lesson-app.git
```

在终端运行：

```bash
cd /Users/rofi/Desktop/secure-lesson-app

# 添加远程仓库（替换 YOUR_USERNAME 和仓库名称）
git remote add origin https://github.com/YOUR_USERNAME/secure-lesson-app.git

# 推送到 GitHub
git push -u origin main
```

如果遇到认证问题，可能需要：
- 使用 Personal Access Token 代替密码
- 或配置 SSH key

---

## 步骤 3: 部署到 Vercel

### 方法一：通过 Vercel Dashboard（推荐）

1. **前往 Vercel Dashboard**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 **Add New Project**
   - 选择您刚创建的 GitHub 仓库
   - 点击 **Import**

3. **配置项目**
   - **Framework Preset**: Other（或留空）
   - **Root Directory**: `./`（默认）
   - **Build Command**: （留空，因为是静态文件）
   - **Output Directory**: （留空）

4. **环境变量（可选）**
   - 如果需要使用环境变量，在 **Environment Variables** 中添加：
     - `VITE_SUPABASE_URL` = `https://jlkgqaezgoajsnimogra.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `您的 Anon Key`
   - **注意**：由于代码中已有默认值，这一步是可选的

5. **部署**
   - 点击 **Deploy**
   - 等待部署完成（通常 1-2 分钟）

### 方法二：使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 在项目目录中部署
cd /Users/rofi/Desktop/secure-lesson-app
vercel

# 部署到生产环境
vercel --prod
```

---

## 快速命令参考

### 如果仓库已存在，只需推送：

```bash
cd /Users/rofi/Desktop/secure-lesson-app
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

### 如果需要更新远程 URL：

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

---

## 部署后检查

部署成功后，Vercel 会提供一个 URL，类似：
```
https://your-project.vercel.app
```

访问这个 URL，您应该看到：
1. 登录界面
2. 可以注册/登录
3. 登录后可以使用所有功能

---

## 故障排除

### 问题：Git push 失败 - 认证错误

**解决方案**：
1. 使用 Personal Access Token：
   - GitHub Settings > Developer settings > Personal access tokens
   - 创建新 token，勾选 `repo` 权限
   - 使用 token 作为密码

2. 或使用 SSH：
   ```bash
   git remote set-url origin git@github.com:YOUR_USERNAME/REPO_NAME.git
   ```

### 问题：Vercel 部署失败

**解决方案**：
1. 检查 `vercel.json` 配置
2. 查看 Vercel 部署日志
3. 确认 GitHub 仓库已正确连接

---

## 完成后的架构

```
GitHub Repository
    ↓ (自动部署)
Vercel (前端)
    ↓ (API 调用)
Supabase (后端)
    ├── Database
    ├── Authentication
    └── Edge Functions (gemini-proxy)
```

祝部署顺利！🚀

