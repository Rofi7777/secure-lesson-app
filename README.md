# 安全學習平台

這是一個使用 Supabase 身份驗證保護的多功能 AI 學習平台。所有 API keys 都安全地存放在後端，只有已登入的使用者才能使用服務。

## 主要功能

- ✅ Supabase 身份驗證（登入/註冊）
- ✅ 安全的 API key 管理（Gemini API key 存放在後端）
- ✅ 多語言學習平台
- ✅ AI 助教和 AI 小醫生
- ✅ 兒童繪本朗讀
- ✅ 辯論教練

## 快速開始

### 1. 設定 Supabase

請參考 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 了解詳細的設定步驟。

**快速步驟：**
1. 在 Supabase Dashboard 建立專案
2. 取得專案 URL 和 Anon Key
3. 在 `index.html` 中更新 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
4. 部署 Edge Function（見下方）

### 2. 部署 Edge Function

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 登入並連結專案
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 設定環境變數（在 Supabase Dashboard > Edge Functions > Secrets）
# GEMINI_API_KEY=your_actual_gemini_api_key

# 部署
supabase functions deploy gemini-proxy
```

### 3. 開啟應用程式

直接在瀏覽器中開啟 `index.html`，或使用本地伺服器：

```bash
# 使用 Python
python -m http.server 8000

# 或使用 Node.js
npx serve
```

然後在瀏覽器中訪問 `http://localhost:8000`

## 安全改進

### 之前（不安全）
- ❌ API key 直接暴露在前端程式碼中
- ❌ 任何人都可以查看和使用 API key
- ❌ 沒有使用量控制

### 現在（安全）
- ✅ API key 存放在 Supabase Edge Function 的環境變數中
- ✅ 所有 API 請求都需要身份驗證
- ✅ 只有已登入的使用者才能使用服務
- ✅ API key 不會暴露給前端

## 檔案結構

```
secure-lesson-app/
├── index.html              # 主應用程式檔案
├── app.js                  # （如果有的話）
├── supabase/
│   └── functions/
│       └── gemini-proxy/
│           └── index.ts    # Edge Function（保護 API key）
├── SUPABASE_SETUP.md       # Supabase 設定指南
└── README.md               # 本檔案
```

## 注意事項

⚠️ **重要：**
- 不要將 `GEMINI_API_KEY` 提交到版本控制系統
- 確保在 Supabase Dashboard 中正確設定環境變數
- 定期檢查使用量和費用

## 支援

如有問題，請檢查：
1. Supabase Dashboard 中的 Edge Function 日誌
2. 瀏覽器控制台的錯誤訊息
3. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 中的故障排除章節

