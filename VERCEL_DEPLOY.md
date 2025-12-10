# Vercel 部署指南

本指南将帮助您将应用从 Netlify 迁移到 Vercel，同时继续使用 Supabase 作为后端。

## 架构说明

- **前端**: Vercel（静态文件托管）
- **后端**: Supabase（数据库 + Edge Functions）
- **Edge Functions**: 在 Supabase 上运行（不受 Vercel 影响）

## 部署步骤

### 方法一：通过 Vercel Dashboard（推荐）

#### 1. 准备代码仓库

确保您的代码已推送到 Git 仓库（GitHub、GitLab 或 Bitbucket）。

#### 2. 连接 Vercel

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New Project**
3. 导入您的 Git 仓库
4. 选择项目

#### 3. 配置环境变量（可选）

**注意**：由于 Supabase Anon Key 本身就是设计为公开的，您可以选择：
- **选项 A**：不设置环境变量，直接使用代码中的值（最简单）
- **选项 B**：设置环境变量，在构建时替换（更灵活）

**如果选择选项 B，在 Vercel Dashboard 中：**
1. 进入项目设置
2. 点击 **Environment Variables**
3. 添加以下变量：

```
VITE_SUPABASE_URL=https://jlkgqaezgoajsnimogra.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsa2dxYWV6Z29hanNuaW1vZ3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzM0MDAsImV4cCI6MjA4MDkwOTQwMH0.wqW8L4VmNIfeU2jLoFKmeA5ZisD_N-ILBfb_vUUxLtg
```

**如果选择选项 A**：直接跳过此步骤，代码中的默认值会被使用。

⚠️ **安全提示**：虽然 Anon Key 是公开的，但建议使用环境变量管理，这样更灵活。

#### 4. 配置构建设置

Vercel 会自动检测到 `vercel.json` 配置文件。

**如果使用环境变量（选项 B）**：
- **Framework Preset**: Other
- **Build Command**: `npm run build`（会自动运行）
- **Output Directory**: `.`（根目录）
- **Install Command**: `npm install`（会自动运行）

**如果不使用环境变量（选项 A）**：
- **Framework Preset**: Other
- **Build Command**: （留空）
- **Output Directory**: （留空）
- **Install Command**: （留空）

#### 5. 部署

点击 **Deploy** 按钮，Vercel 会自动部署您的应用。

---

### 方法二：使用 Vercel CLI

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

#### 3. 在项目目录中部署

```bash
cd /Users/rofi/Desktop/secure-lesson-app
vercel
```

#### 4. 设置环境变量

```bash
vercel env add VITE_SUPABASE_URL
# 输入: https://jlkgqaezgoajsnimogra.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# 输入: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsa2dxYWV6Z29hanNuaW1vZ3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzM0MDAsImV4cCI6MjA4MDkwOTQwMH0.wqW8L4VmNIfeU2jLoFKmeA5ZisD_N-ILBfb_vUUxLtg
```

#### 5. 部署到生产环境

```bash
vercel --prod
```

---

## 重要配置说明

### 1. Edge Function 部署

**Edge Functions 仍然在 Supabase 上运行**，不受 Vercel 影响。

请确保您已经按照 `DEPLOY_GUIDE.md` 部署了 `gemini-proxy` Edge Function。

### 2. 环境变量

代码已经更新为支持环境变量，优先级：
1. `import.meta.env.VITE_SUPABASE_URL` (Vite)
2. `process.env.VITE_SUPABASE_URL` (Node.js)
3. `window.__ENV__.VITE_SUPABASE_URL` (Vercel 注入)
4. 直接配置的值（fallback）

### 3. CORS 配置

Supabase Edge Functions 已经配置了 CORS，允许来自任何域名的请求。如果遇到 CORS 问题，请检查 Edge Function 的 CORS 设置。

---

## 从 Netlify 迁移

### 迁移检查清单

- [ ] 代码已推送到 Git 仓库
- [ ] 在 Vercel 中创建项目
- [ ] 设置环境变量
- [ ] 部署 Edge Function 到 Supabase（如果还没做）
- [ ] 测试应用功能
- [ ] 更新域名 DNS（如果需要）

### Netlify 环境变量迁移

如果您在 Netlify 中使用了环境变量，需要在 Vercel 中重新设置：

**Netlify** → **Vercel**
- `REACT_APP_*` → `VITE_*` 或直接使用变量名
- 其他变量名保持不变

---

## 本地开发

### 使用环境变量文件

创建 `.env.local` 文件（不要提交到 Git）：

```env
VITE_SUPABASE_URL=https://jlkgqaezgoajsnimogra.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsa2dxYWV6Z29hanNuaW1vZ3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMzM0MDAsImV4cCI6MjA4MDkwOTQwMH0.wqW8L4VmNIfeU2jLoFKmeA5ZisD_N-ILBfb_vUUxLtg
```

### 本地测试

```bash
# 使用 Python
python -m http.server 8000

# 或使用 Node.js
npx serve

# 或使用 Vercel CLI
vercel dev
```

---

## 故障排除

### 问题：环境变量未生效

**解决方案**：
1. 检查 Vercel Dashboard 中的环境变量设置
2. 确保变量名以 `VITE_` 开头（如果使用 Vite）
3. 重新部署应用

### 问题：Edge Function 返回 401 错误

**解决方案**：
1. 确保用户已登录
2. 检查 Supabase 认证配置
3. 查看浏览器控制台的错误信息

### 问题：CORS 错误

**解决方案**：
1. 检查 Edge Function 的 CORS 配置
2. 确保 Edge Function 已正确部署
3. 检查请求头中的 Authorization

---

## 优势

使用 Vercel + Supabase 的优势：

✅ **快速部署**: Vercel 的全球 CDN 加速
✅ **自动 HTTPS**: 免费 SSL 证书
✅ **环境变量管理**: 安全的配置管理
✅ **预览部署**: 每个 PR 都有预览链接
✅ **Supabase 集成**: 无缝的后端服务
✅ **Edge Functions**: 在 Supabase 上运行，不受前端部署影响

---

## 下一步

1. ✅ 部署 Edge Function 到 Supabase（参考 `DEPLOY_GUIDE.md`）
2. ✅ 在 Vercel 中创建项目
3. ✅ 设置环境变量
4. ✅ 部署应用
5. ✅ 测试所有功能

祝部署顺利！🚀

