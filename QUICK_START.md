# 快速开始 - Vercel 部署

## 🚀 最简单的部署方式（推荐）

### 1. 准备代码

确保您的代码已推送到 Git 仓库（GitHub、GitLab 或 Bitbucket）。

### 2. 部署到 Vercel

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Add New Project**
3. 导入您的 Git 仓库
4. 点击 **Deploy**

**就这么简单！** 代码中已经包含了 Supabase 配置，不需要额外设置。

### 3. 部署 Edge Function（如果还没做）

Edge Function 需要在 Supabase 上单独部署，参考 `DEPLOY_GUIDE.md`。

---

## 📋 完整部署清单

### Supabase 端
- [ ] 部署 `gemini-proxy` Edge Function（参考 `DEPLOY_GUIDE.md`）
- [ ] 设置 `GEMINI_API_KEY` 环境变量在 Supabase

### Vercel 端
- [ ] 连接 Git 仓库
- [ ] 点击 Deploy
- [ ] （可选）设置自定义域名

### 测试
- [ ] 打开部署的网站
- [ ] 注册/登录账号
- [ ] 测试应用功能

---

## 💡 提示

- **Supabase Anon Key** 是公开的，可以安全地放在前端代码中
- **Edge Functions** 在 Supabase 上运行，不受 Vercel 影响
- 如果需要使用环境变量，参考 `VERCEL_DEPLOY.md`

---

## 🆘 需要帮助？

- Edge Function 部署问题 → 查看 `DEPLOY_GUIDE.md`
- Vercel 部署问题 → 查看 `VERCEL_DEPLOY.md`
- 一般问题 → 查看 `README.md`

