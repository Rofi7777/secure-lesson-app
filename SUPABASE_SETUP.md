# Supabase 設定指南

這個應用程式現在使用 Supabase 進行身份驗證，並將 Gemini API key 安全地存放在後端。

## 設定步驟

### 1. 在 Supabase 中建立專案

1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 建立新專案或選擇現有專案
3. 記下您的專案 URL 和 Anon Key（可在 Settings > API 找到）

### 2. 設定環境變數

在 Supabase Dashboard 中：
1. 前往 **Settings** > **Edge Functions** > **Secrets**
2. 新增以下環境變數：
   - `GEMINI_API_KEY`: 您的 Gemini API key（原本在前端的 key）
   - `SUPABASE_URL`: 您的 Supabase 專案 URL（通常會自動設定）
   - `SUPABASE_ANON_KEY`: 您的 Supabase Anon Key（通常會自動設定）

### 3. 部署 Edge Function

使用 Supabase CLI 部署 Edge Function：

```bash
# 安裝 Supabase CLI（如果還沒安裝）
npm install -g supabase

# 登入 Supabase
supabase login

# 連結到您的專案
supabase link --project-ref YOUR_PROJECT_REF

# 部署 Edge Function
supabase functions deploy gemini-proxy
```

或者，您可以在 Supabase Dashboard 中：
1. 前往 **Edge Functions**
2. 點擊 **Create a new function**
3. 命名為 `gemini-proxy`
4. 複製 `supabase/functions/gemini-proxy/index.ts` 的內容到編輯器中
5. 點擊 **Deploy**

### 4. 更新前端配置

在 `index.html` 中，找到以下行並替換為您的 Supabase 憑證：

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // 例如：'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // 您的 Supabase anon/public key
```

### 5. 設定身份驗證

在 Supabase Dashboard 中：
1. 前往 **Authentication** > **Providers**
2. 確保 **Email** provider 已啟用
3. （可選）設定電子郵件驗證範本

### 6. 測試

1. 開啟應用程式
2. 您應該會看到登入畫面
3. 註冊一個新帳號
4. 登入後，應用程式應該正常運作

## 安全注意事項

✅ **已完成的安全改進：**
- API key 已從前端移除
- API key 現在存放在 Supabase Edge Function 的環境變數中
- 所有 API 請求都需要身份驗證
- 只有已登入的使用者才能使用服務

⚠️ **重要提醒：**
- 不要將 `GEMINI_API_KEY` 提交到版本控制系統
- 定期輪換您的 API keys
- 考慮在 Supabase 中設定使用量限制（Rate Limiting）

## 故障排除

### 問題：Edge Function 返回 401 錯誤
- 檢查 Supabase URL 和 Anon Key 是否正確設定
- 確認使用者已成功登入

### 問題：Edge Function 返回 500 錯誤
- 檢查 `GEMINI_API_KEY` 環境變數是否已正確設定
- 查看 Supabase Dashboard 中的 Edge Function 日誌

### 問題：無法登入
- 檢查 Supabase 專案中的 Authentication 設定
- 確認 Email provider 已啟用
- 檢查瀏覽器控制台是否有錯誤訊息

## 額外功能建議

您可以進一步增強安全性：
1. 在 Supabase 中設定 Row Level Security (RLS) 政策
2. 實作使用量追蹤和限制
3. 新增更多身份驗證方式（Google、GitHub 等）
4. 設定電子郵件驗證要求

