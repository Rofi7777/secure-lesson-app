-- 管理授权用户的 SQL 脚本
-- 在 Supabase Dashboard > SQL Editor 中运行这些命令

-- ============================================
-- 1. 添加授权用户（通过用户 ID）
-- ============================================
-- 替换 'USER_ID_HERE' 为实际的用户 ID
-- 您可以在 Supabase Dashboard > Authentication > Users 中找到用户 ID

INSERT INTO authorized_users (user_id, email, is_active, notes)
VALUES (
  'USER_ID_HERE'::UUID,  -- 替换为实际用户 ID
  'user@example.com',   -- 替换为实际邮箱
  true,
  '手动添加的授权用户'
);

-- ============================================
-- 2. 添加授权用户（通过邮箱）
-- ============================================
-- 这个函数会自动查找用户 ID

INSERT INTO authorized_users (user_id, email, is_active, notes)
SELECT 
  id as user_id,
  email,
  true,
  '通过邮箱添加的授权用户'
FROM auth.users
WHERE email = 'user@example.com'  -- 替换为实际邮箱
ON CONFLICT (user_id) DO UPDATE
SET is_active = true, updated_at = now();

-- ============================================
-- 3. 查看所有授权用户
-- ============================================

SELECT 
  au.id,
  au.user_id,
  au.email,
  au.is_active,
  au.created_at,
  au.updated_at,
  au.notes,
  u.email as auth_email,  -- 从 auth.users 表验证邮箱
  u.created_at as user_created_at
FROM authorized_users au
LEFT JOIN auth.users u ON au.user_id = u.id
ORDER BY au.created_at DESC;

-- ============================================
-- 4. 查看活跃的授权用户
-- ============================================

SELECT 
  au.email,
  au.created_at,
  au.notes
FROM authorized_users au
WHERE au.is_active = true
ORDER BY au.created_at DESC;

-- ============================================
-- 5. 停用用户（不删除，只是标记为不活跃）
-- ============================================

UPDATE authorized_users
SET is_active = false, updated_at = now()
WHERE email = 'user@example.com';  -- 替换为实际邮箱

-- ============================================
-- 6. 重新激活用户
-- ============================================

UPDATE authorized_users
SET is_active = true, updated_at = now()
WHERE email = 'user@example.com';  -- 替换为实际邮箱

-- ============================================
-- 7. 删除授权用户（完全移除）
-- ============================================

DELETE FROM authorized_users
WHERE email = 'user@example.com';  -- 替换为实际邮箱

-- ============================================
-- 8. 批量添加多个用户（通过邮箱列表）
-- ============================================

INSERT INTO authorized_users (user_id, email, is_active, notes)
SELECT 
  u.id as user_id,
  u.email,
  true,
  '批量添加的授权用户'
FROM auth.users u
WHERE u.email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
  -- 添加更多邮箱
)
ON CONFLICT (user_id) DO UPDATE
SET is_active = true, updated_at = now();

-- ============================================
-- 9. 检查特定用户是否已授权
-- ============================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM authorized_users 
      WHERE user_id = 'USER_ID_HERE'::UUID  -- 替换为实际用户 ID
      AND is_active = true
    ) THEN '已授权'
    ELSE '未授权'
  END as authorization_status;

-- ============================================
-- 10. 查看未授权的注册用户
-- ============================================

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

