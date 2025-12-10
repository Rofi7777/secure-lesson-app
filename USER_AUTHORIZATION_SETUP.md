# 用户权限控制设置指南

## 概述

现在应用已经实现了用户权限控制，只有被授权的用户才能使用服务。新注册的用户需要管理员手动授权才能使用。

## 设置步骤

### 步骤 1: 创建授权用户表

1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 点击左侧菜单的 **SQL Editor**
3. 点击 **New query**
4. 复制 `supabase/migrations/001_create_authorized_users.sql` 文件的内容
5. 粘贴到 SQL Editor 中
6. 点击 **Run** 执行

这会创建：
- `authorized_users` 表（存储授权用户）
- 必要的索引和策略
- `is_user_authorized()` 函数

### 步骤 2: 设置 Edge Function 环境变量

Edge Function 需要 Service Role Key 来查询授权用户表：

1. 前往 **Settings** > **API**
2. 找到 **service_role key**（⚠️ 这是敏感密钥，不要在前端使用）
3. 前往 **Edge Functions** > **Secrets**
4. 添加新的 Secret：
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: 粘贴您的 service_role key
5. 点击 **Save**

### 步骤 3: 更新 Edge Function

Edge Function 已经更新，会自动检查用户权限。如果还没有部署最新版本：

1. 前往 **Edge Functions** > **gemini-proxy**
2. 复制更新后的 `supabase/functions/gemini-proxy/index.ts` 内容
3. 点击 **Deploy** 重新部署

### 步骤 4: 添加授权用户

#### 方法一：通过 SQL Editor（推荐）

1. 在 Supabase Dashboard 中，前往 **SQL Editor**
2. 使用 `supabase/manage_authorized_users.sql` 中的 SQL 命令

**添加单个用户（通过邮箱）：**
```sql
INSERT INTO authorized_users (user_id, email, is_active, notes)
SELECT 
  id as user_id,
  email,
  true,
  '手动添加的授权用户'
FROM auth.users
WHERE email = 'user@example.com'  -- 替换为实际邮箱
ON CONFLICT (user_id) DO UPDATE
SET is_active = true, updated_at = now();
```

**查看所有授权用户：**
```sql
SELECT 
  au.email,
  au.is_active,
  au.created_at,
  au.notes
FROM authorized_users au
ORDER BY au.created_at DESC;
```

#### 方法二：通过 Supabase Dashboard

1. 前往 **Table Editor**
2. 选择 `authorized_users` 表
3. 点击 **Insert row**
4. 填写：
   - `user_id`: 从 **Authentication > Users** 中复制用户 ID
   - `email`: 用户邮箱
   - `is_active`: `true`
   - `notes`: （可选）备注
5. 点击 **Save**

### 步骤 5: 查看注册但未授权的用户

运行以下 SQL 查询：

```sql
SELECT 
  u.id,
  u.email,
  u.created_at as registered_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM authorized_users au
  WHERE au.user_id = u.id AND au.is_active = true
)
ORDER BY u.created_at DESC;
```

## 工作流程

### 新用户注册流程

1. 用户注册账号 → 账号创建成功
2. 用户尝试登录 → 登录成功
3. **系统检查权限** → 如果未授权，自动登出并显示错误信息
4. 管理员在 Supabase 中添加用户到 `authorized_users` 表
5. 用户再次登录 → 可以正常使用

### 管理员操作流程

1. **查看新注册用户**：
   - 在 Supabase Dashboard > Authentication > Users 查看
   - 或运行 SQL 查询查看未授权用户

2. **授权用户**：
   - 使用 SQL Editor 添加用户到 `authorized_users` 表
   - 或通过 Table Editor 手动添加

3. **停用用户**：
   ```sql
   UPDATE authorized_users
   SET is_active = false
   WHERE email = 'user@example.com';
   ```

4. **重新激活用户**：
   ```sql
   UPDATE authorized_users
   SET is_active = true
   WHERE email = 'user@example.com';
   ```

## 常用 SQL 命令

### 添加授权用户
```sql
-- 通过邮箱添加
INSERT INTO authorized_users (user_id, email, is_active, notes)
SELECT id, email, true, '手动添加'
FROM auth.users
WHERE email = 'user@example.com'
ON CONFLICT (user_id) DO UPDATE
SET is_active = true, updated_at = now();
```

### 查看所有授权用户
```sql
SELECT email, is_active, created_at, notes
FROM authorized_users
ORDER BY created_at DESC;
```

### 停用用户
```sql
UPDATE authorized_users
SET is_active = false
WHERE email = 'user@example.com';
```

### 批量添加用户
```sql
INSERT INTO authorized_users (user_id, email, is_active, notes)
SELECT id, email, true, '批量添加'
FROM auth.users
WHERE email IN ('user1@example.com', 'user2@example.com')
ON CONFLICT (user_id) DO UPDATE
SET is_active = true;
```

## 安全说明

✅ **已实现的安全功能：**
- 只有授权用户才能使用 Edge Function
- 未授权用户登录后会自动登出
- 前端和后端双重验证
- Row Level Security (RLS) 保护数据

⚠️ **注意事项：**
- 确保定期检查未授权用户
- 及时授权合法用户
- 停用不再需要的用户账号

## 故障排除

### 问题：用户已授权但仍无法使用

**解决方案：**
1. 检查 `authorized_users` 表中用户是否存在
2. 确认 `is_active` 为 `true`
3. 检查 `user_id` 是否正确匹配
4. 查看 Edge Function 日志

### 问题：如何快速授权多个用户

**解决方案：**
使用批量添加 SQL：
```sql
INSERT INTO authorized_users (user_id, email, is_active)
SELECT id, email, true
FROM auth.users
WHERE email IN ('user1@example.com', 'user2@example.com', ...)
ON CONFLICT (user_id) DO UPDATE SET is_active = true;
```

## 下一步

1. ✅ 运行 SQL 创建表
2. ✅ 授权第一个用户（您自己）
3. ✅ 测试登录和权限检查
4. ✅ 建立用户授权流程

现在您的应用已经实现了完整的用户权限控制！🎉

