# 🔧 Gemini Proxy 500 錯誤快速修復

## 問題診斷

錯誤 `Status code: 500` 表示 Edge Function 內部錯誤。根據代碼分析，最可能的原因是：

1. ❌ **GEMINI_API_KEY 未設置**（最常見）
2. ❌ **SUPABASE_SERVICE_ROLE_KEY 未設置**
3. ❌ **authorized_users 表不存在**

## ⚡ 快速修復步驟（5分鐘）

### 步驟 1: 設置環境變量（必須！）

1. **前往 Supabase Dashboard**
   - 打開：https://app.supabase.com/project/jlkggaezgoajsnimogra
   - 點擊左側 **Edge Functions**

2. **找到 gemini-proxy 函數**
   - 點擊 `gemini-proxy` 函數名稱

3. **設置 Secrets（環境變量）**
   - 點擊 **Settings** 標籤
   - 在 **Secrets** 區域，點擊 **Add new secret**
   
   **添加第一個 Secret：**
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 您的 Gemini API Key（從 https://aistudio.google.com/apikey 獲取）
   - 點擊 **Save**
   
   **添加第二個 Secret：**
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: 
     1. 前往 **Project Settings** → **API**
     2. 找到 **service_role** key（在 "Project API keys" 區域）
     3. 點擊眼睛圖標顯示，然後複製
     4. 貼上到 Value 欄位
   - 點擊 **Save**

4. **重新部署函數**（重要！）
   - 點擊 **Deploy** 按鈕
   - 等待部署完成（看到 "Deployed successfully"）

### 步驟 2: 確認 authorized_users 表存在

1. **前往 Database → Tables**
2. **檢查是否有 `authorized_users` 表**
   - 如果沒有，執行以下 SQL：

```sql
CREATE TABLE IF NOT EXISTS authorized_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT,
  UNIQUE(user_id)
);

ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own authorization"
  ON authorized_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

3. **確保您的帳號已授權**
   - 如果您的 email 是 `rofi90@hotmail.com`，應該已經有管理員權限
   - 如果沒有，執行：

```sql
INSERT INTO authorized_users (user_id, email, is_active, notes)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'rofi90@hotmail.com'),
  'rofi90@hotmail.com',
  true,
  'Admin user'
)
ON CONFLICT (user_id) DO UPDATE SET is_active = true;
```

### 步驟 3: 檢查 Edge Function 日誌

1. **前往 Edge Functions → gemini-proxy**
2. **點擊 Logs 標籤**
3. **查看最新錯誤訊息**
   - 如果看到 "GEMINI_API_KEY not configured" → 環境變量未設置
   - 如果看到 "SUPABASE_SERVICE_ROLE_KEY not set" → 環境變量未設置
   - 如果看到其他錯誤 → 根據錯誤訊息修復

### 步驟 4: 測試修復

1. **刷新應用頁面**
2. **重新登入**
3. **嘗試生成課程**
4. **檢查瀏覽器控制台**
   - 應該不再有 500 錯誤
   - 如果還有錯誤，查看具體錯誤訊息

## ✅ 檢查清單

完成後確認：

- [ ] `GEMINI_API_KEY` 已設置在 Edge Function Secrets 中
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 已設置在 Edge Function Secrets 中
- [ ] Edge Function 已重新部署（設置環境變量後必須重新部署！）
- [ ] `authorized_users` 表已存在
- [ ] 您的用戶已在 `authorized_users` 表中且 `is_active = true`
- [ ] 測試生成課程功能正常

## 🚨 如果還是不行

1. **查看 Edge Function 日誌**（最重要！）
   - Edge Functions → gemini-proxy → Logs
   - 複製錯誤訊息

2. **檢查 Gemini API Key 是否有效**
   - 前往 https://aistudio.google.com/apikey
   - 確認 API Key 狀態為 Active

3. **確認 Supabase 項目配置**
   - Project Settings → API
   - 確認 service_role key 正確

4. **聯繫支持**
   - 提供 Edge Function 日誌中的完整錯誤訊息

## 📝 注意事項

⚠️ **重要**：設置環境變量後，**必須重新部署** Edge Function 才會生效！

⚠️ **安全**：`SUPABASE_SERVICE_ROLE_KEY` 是 secret key，不要分享或提交到 Git！

