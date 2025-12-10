-- 创建授权用户表
-- 这个表用于管理哪些用户可以使用应用

CREATE TABLE IF NOT EXISTS authorized_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT -- 可选：添加备注，例如用户来源等
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_authorized_users_user_id ON authorized_users(user_id);
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
CREATE INDEX IF NOT EXISTS idx_authorized_users_is_active ON authorized_users(is_active);

-- 启用 Row Level Security (RLS)
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

-- 创建策略：只有服务角色可以读取（用于 Edge Function）
CREATE POLICY "Service role can read authorized_users"
  ON authorized_users
  FOR SELECT
  TO service_role
  USING (true);

-- 创建策略：只有服务角色可以插入
CREATE POLICY "Service role can insert authorized_users"
  ON authorized_users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 创建策略：只有服务角色可以更新
CREATE POLICY "Service role can update authorized_users"
  ON authorized_users
  FOR UPDATE
  TO service_role
  USING (true);

-- 创建策略：只有服务角色可以删除
CREATE POLICY "Service role can delete authorized_users"
  ON authorized_users
  FOR DELETE
  TO service_role
  USING (true);

-- 创建策略：允许用户查询自己的授权状态（用于前端检查）
CREATE POLICY "Users can check their own authorization"
  ON authorized_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 创建函数：检查用户是否已授权
CREATE OR REPLACE FUNCTION is_user_authorized(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM authorized_users 
    WHERE user_id = user_uuid 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

