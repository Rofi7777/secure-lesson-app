# Gemini Proxy Edge Function 故障排除指南

## 🔴 錯誤症狀

- **錯誤訊息**: `Preflight response is not successful. Status code: 500`
- **錯誤訊息**: `Fetch API cannot load .../gemini-proxy due to access control checks`
- **錯誤訊息**: `Gemini API Error: TypeError: Load failed`
- **錯誤訊息**: `Lesson Generation Error: TypeError: Load failed`

## 🔍 可能原因與解決方案

### 1. GEMINI_API_KEY 環境變量未設置 ⚠️ 最常見

**檢查方法：**
1. 前往 Supabase Dashboard
2. 點擊 **Edge Functions** → **gemini-proxy**
3. 點擊 **Settings** 標籤
4. 查看 **Secrets** 區域，確認是否有 `GEMINI_API_KEY`

**解決方案：**
1. 在 Edge Functions 頁面，點擊 **Settings** 標籤
2. 在 **Secrets** 區域，點擊 **Add new secret**
3. 輸入：
   - **Name**: `GEMINI_API_KEY`
   - **Value**: 您的 Gemini API Key（從 Google AI Studio 獲取）
4. 點擊 **Save**
5. **重要**：重新部署 Edge Function（點擊 **Deploy** 按鈕）

### 2. SUPABASE_SERVICE_ROLE_KEY 環境變量未設置

**檢查方法：**
1. 前往 Supabase Dashboard → **Project Settings** → **API**
2. 查看 **service_role** key（注意：這是 secret key，不要公開）

**解決方案：**
1. 在 Edge Functions 頁面，點擊 **Settings** 標籤
2. 在 **Secrets** 區域，點擊 **Add new secret**
3. 輸入：
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: 從 Project Settings → API 複製的 service_role key
4. 點擊 **Save**
5. 重新部署 Edge Function

### 3. authorized_users 表不存在

**檢查方法：**
1. 前往 Supabase Dashboard → **Database** → **Tables**
2. 確認是否有 `authorized_users` 表

**解決方案：**
如果表不存在，需要創建它。執行以下 SQL：

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

### 4. 用戶未在 authorized_users 表中

**檢查方法：**
1. 前往 Supabase Dashboard → **Database** → **Tables** → **authorized_users**
2. 點擊 **View data** 或 **Browse**
3. 確認您的用戶 ID 是否存在且 `is_active = true`

**解決方案：**
1. 如果您的 email 是 `rofi90@hotmail.com`，應該已經有管理員權限
2. 如果沒有，手動添加：
   ```sql
   INSERT INTO authorized_users (user_id, email, is_active, notes)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
     'your-email@example.com',
     true,
     'Added manually'
   );
   ```

### 5. Edge Function 未正確部署

**檢查方法：**
1. 前往 Supabase Dashboard → **Edge Functions**
2. 確認 `gemini-proxy` 函數存在且狀態為 **Active**

**解決方案：**
1. 如果函數不存在，創建它：
   - 點擊 **Create a new function**
   - 名稱輸入：`gemini-proxy`
   - 複製 `supabase/functions/gemini-proxy/index.ts` 的內容
   - 貼上到編輯器
   - 設置環境變量（見上面步驟 1 和 2）
   - 點擊 **Deploy**

2. 如果函數存在但狀態不是 Active：
   - 點擊函數名稱
   - 檢查代碼是否正確
   - 點擊 **Deploy** 重新部署

## 🔧 快速修復步驟

### 步驟 1: 檢查環境變量
```bash
# 在 Supabase Dashboard 中檢查
Edge Functions → gemini-proxy → Settings → Secrets
```

必須有以下環境變量：
- ✅ `GEMINI_API_KEY` - 您的 Gemini API Key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - 從 Project Settings → API 獲取

### 步驟 2: 檢查 authorized_users 表
```sql
-- 在 SQL Editor 中執行
SELECT * FROM authorized_users WHERE is_active = true;
```

### 步驟 3: 檢查 Edge Function 日誌
1. 前往 Supabase Dashboard → **Edge Functions** → **gemini-proxy**
2. 點擊 **Logs** 標籤
3. 查看最新的錯誤訊息

### 步驟 4: 測試 Edge Function
在瀏覽器控制台執行（需要先登入）：

```javascript
// 獲取 access token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// 測試 Edge Function
fetch('https://jlkggaezgoajsnimogra.supabase.co/functions/v1/gemini-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    endpoint: 'generateContent',
    model: 'gemini-2.5-flash-preview-09-2025',
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 📋 完整檢查清單

- [ ] `GEMINI_API_KEY` 環境變量已設置
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 環境變量已設置
- [ ] `authorized_users` 表已創建
- [ ] 用戶已添加到 `authorized_users` 表且 `is_active = true`
- [ ] `gemini-proxy` Edge Function 已部署且狀態為 Active
- [ ] Edge Function 代碼正確（檢查 `index.ts`）
- [ ] 重新部署 Edge Function（設置環境變量後必須重新部署）

## 🚨 常見錯誤訊息對應

| 錯誤訊息 | 可能原因 | 解決方案 |
|---------|---------|---------|
| `Status code: 500` | 環境變量未設置或代碼錯誤 | 檢查環境變量，查看日誌 |
| `Missing authorization header` | 未登入或 token 未傳遞 | 確保用戶已登入 |
| `Unauthorized` | 用戶認證失敗 | 檢查登入狀態 |
| `Access denied` | 用戶未在 authorized_users 表中 | 添加用戶到 authorized_users 表 |
| `Gemini API key not configured` | GEMINI_API_KEY 未設置 | 設置環境變量並重新部署 |
| `Server configuration error` | SUPABASE_SERVICE_ROLE_KEY 未設置 | 設置環境變量並重新部署 |

## 💡 提示

1. **環境變量設置後必須重新部署** Edge Function 才會生效
2. **檢查日誌**是最快找到問題的方法
3. **使用管理員帳號**（rofi90@hotmail.com）應該已經有權限，如果沒有，檢查 `authorized_users` 表

## 🔗 相關文檔

- [Supabase Edge Functions 文檔](https://supabase.com/docs/guides/functions)
- [環境變量設置](https://supabase.com/docs/guides/functions/secrets)
- [Gemini API 文檔](https://ai.google.dev/docs)

