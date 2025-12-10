# Edge Function 部署指南

## ⚡ 最快方法：使用 Supabase Dashboard（推荐，无需安装）

这是最简单的方法，不需要安装任何工具！

### 步骤 1: 创建 Edge Function

1. 前往 [Supabase Dashboard](https://app.supabase.com/project/jlkgqaezgoajsnimogra)
2. 点击左侧菜单的 **Edge Functions**
3. 点击右上角的 **Create a new function** 按钮
4. 输入函数名称：`gemini-proxy`
5. 点击 **Create function**

### 步骤 2: 复制代码

1. 打开项目中的文件：`supabase/functions/gemini-proxy/index.ts`
2. 复制**全部内容**（全选 Cmd+A，复制 Cmd+C）
3. 在 Dashboard 的代码编辑器中，删除默认代码，粘贴您复制的代码

### 步骤 3: 设置环境变量（重要！）

在部署之前，必须先设置 `GEMINI_API_KEY`：

1. 在 Edge Functions 页面，点击 **Secrets** 标签（在代码编辑器上方）
2. 点击 **Add new secret** 按钮
3. 输入：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 您的 Gemini API key（例如：`AIzaSyD08MzD3ahC2opquhZ9r93TwoOTmQb86a0`）
4. 点击 **Save**

⚠️ **重要**：确保在部署前设置好这个环境变量，否则 Edge Function 会返回错误。

### 步骤 4: 部署

1. 点击代码编辑器右上角的 **Deploy** 按钮（或按 Cmd+S）
2. 等待部署完成（通常几秒钟）
3. 看到 "Function deployed successfully" 消息

### 步骤 5: 验证

部署完成后，Edge Function 的 URL 应该是：
```
https://jlkgqaezgoajsnimogra.supabase.co/functions/v1/gemini-proxy
```

您可以在 Dashboard 中看到这个 URL。

---

## 方法二：使用 Supabase CLI（需要安装）

### 步骤 1: 安装 Supabase CLI

```bash
# 使用 npm 安装
npm install -g supabase

# 或使用 Homebrew (macOS)
brew install supabase/tap/supabase
```

### 步骤 2: 登录 Supabase

```bash
supabase login
```

这会打开浏览器让您登录 Supabase 账号。

### 步骤 3: 初始化 Supabase 项目（如果还没有）

在项目根目录运行：

```bash
cd /Users/rofi/Desktop/secure-lesson-app
supabase init
```

### 步骤 4: 链接到您的 Supabase 项目

```bash
# 使用您的项目引用 ID（从 Supabase Dashboard 获取）
supabase link --project-ref jlkgqaezgoajsnimogra
```

或者，如果您知道项目 ID，也可以使用：

```bash
supabase link --project-ref jlkgqaezgoajsnimogra
```

### 步骤 5: 设置环境变量（重要！）

在 Supabase Dashboard 中设置 `GEMINI_API_KEY`：

1. 前往 [Supabase Dashboard](https://app.supabase.com/project/jlkgqaezgoajsnimogra)
2. 点击左侧菜单的 **Edge Functions**
3. 点击 **Secrets** 标签
4. 点击 **Add new secret**
5. 输入：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 您的 Gemini API key（例如：`AIzaSyD08MzD3ahC2opquhZ9r93TwoOTmQb86a0`）
6. 点击 **Save**

### 步骤 6: 部署 Edge Function

```bash
supabase functions deploy gemini-proxy
```

部署成功后，您会看到类似这样的输出：

```
Deploying function gemini-proxy...
Function gemini-proxy deployed successfully!
```

### 步骤 7: 验证部署

部署完成后，Edge Function 的 URL 应该是：
```
https://jlkgqaezgoajsnimogra.supabase.co/functions/v1/gemini-proxy
```

---

## 方法二：使用 Supabase Dashboard（图形界面）

### 步骤 1: 创建 Edge Function

1. 前往 [Supabase Dashboard](https://app.supabase.com/project/jlkgqaezgoajsnimogra)
2. 点击左侧菜单的 **Edge Functions**
3. 点击 **Create a new function**
4. 输入函数名称：`gemini-proxy`
5. 点击 **Create function**

### 步骤 2: 复制代码

1. 打开项目中的文件：`supabase/functions/gemini-proxy/index.ts`
2. 复制全部内容
3. 粘贴到 Dashboard 的代码编辑器中

### 步骤 3: 设置环境变量

1. 在 Edge Functions 页面，点击 **Secrets** 标签
2. 点击 **Add new secret**
3. 输入：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 您的 Gemini API key
4. 点击 **Save**

### 步骤 4: 部署

1. 点击编辑器右上角的 **Deploy** 按钮
2. 等待部署完成

---

## 验证部署是否成功

### 方法 1: 在浏览器中测试

打开浏览器控制台，运行：

```javascript
// 首先需要登录（在应用中）
// 然后测试 Edge Function
fetch('https://jlkgqaezgoajsnimogra.supabase.co/functions/v1/gemini-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN' // 需要从登录后的 session 获取
  },
  body: JSON.stringify({
    endpoint: 'generateContent',
    model: 'gemini-2.5-flash-preview-09-2025',
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
  })
})
.then(r => r.json())
.then(console.log)
```

### 方法 2: 使用应用测试

1. 打开应用
2. 注册/登录账号
3. 尝试使用任何需要调用 Gemini API 的功能
4. 如果功能正常，说明部署成功

---

## 常见问题

### Q: 部署时出现 "Function not found" 错误
**A:** 确保函数名称是 `gemini-proxy`，并且文件路径正确。

### Q: 部署后返回 500 错误
**A:** 检查：
1. `GEMINI_API_KEY` 环境变量是否已设置
2. Gemini API key 是否有效
3. 查看 Edge Functions 的日志（在 Dashboard 中）

### Q: 返回 401 Unauthorized 错误
**A:** 确保：
1. 用户已成功登录
2. Authorization header 正确传递
3. Supabase 认证配置正确

### Q: 如何查看 Edge Function 日志？
**A:** 
1. 在 Supabase Dashboard 中
2. 前往 **Edge Functions** > **gemini-proxy**
3. 点击 **Logs** 标签

---

## 下一步

部署成功后，您的应用应该可以正常工作了！

- ✅ API key 安全地存放在后端
- ✅ 只有已登录的用户才能使用服务
- ✅ 所有 API 调用都通过 Edge Function 进行

如果遇到任何问题，请检查：
1. Edge Function 日志
2. 浏览器控制台错误
3. Supabase Dashboard 中的设置

