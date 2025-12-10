# AI 個性化學習系統 - 詳細部署步驟

## 📋 前置準備

確保您已經：
- ✅ 登入 Supabase Dashboard
- ✅ 選擇了 `secure-lesson` 項目
- ✅ 項目狀態顯示為綠色（運行中）

---

## 步驟 1: 部署數據庫遷移

### 1.1 打開 SQL Editor

1. 在 Supabase Dashboard 左側導航欄，點擊 **SQL Editor** 圖標（文檔圖標）
   - 或者點擊主頁的 **"SQL Editor"** 按鈕

### 1.2 創建新的 SQL 查詢

1. 點擊 **"New query"** 按鈕（通常在右上角）
2. 會出現一個新的 SQL 編輯器窗口

### 1.3 執行第一個遷移文件（學習進度表）

1. 打開文件：`supabase/migrations/002_create_learning_progress_tables.sql`
2. **複製整個文件的內容**（全選 Ctrl+A / Cmd+A，然後複製 Ctrl+C / Cmd+C）
3. 貼上到 SQL Editor 中
4. 點擊 **"Run"** 按鈕（或按快捷鍵 Ctrl+Enter / Cmd+Enter）
5. 等待執行完成，應該會看到 "Success. No rows returned" 的訊息

### 1.4 執行第二個遷移文件（AI 個性化表）

1. 在 SQL Editor 中點擊 **"New query"** 創建新查詢
2. 打開文件：`supabase/migrations/003_create_user_learning_ai_tables.sql`
3. **複製整個文件的內容**
4. 貼上到 SQL Editor 中
5. 點擊 **"Run"** 按鈕
6. 等待執行完成

### 1.5 驗證表創建成功

1. 在左側導航欄點擊 **"Database"** 圖標
2. 點擊 **"Tables"** 標籤
3. 您應該看到以下新表：
   - ✅ `user_lessons`
   - ✅ `user_stories`
   - ✅ `user_tutoring_sessions`
   - ✅ `user_favorites`
   - ✅ `user_learning_stats`
   - ✅ `user_behavior_logs`
   - ✅ `user_preferences`
   - ✅ `ai_response_feedback`
   - ✅ `user_learning_profile`
   - ✅ `ai_user_memories`

---

## 步驟 2: 部署 Edge Functions

### 2.1 部署 learning-progress Function

#### 方法 A: 使用 Supabase Dashboard（推薦）

1. 在左側導航欄點擊 **"Edge Functions"** 圖標（代碼括號圖標）
2. 點擊 **"Create a new function"** 或 **"New Function"** 按鈕
3. 函數名稱輸入：`learning-progress`
4. 點擊 **"Create function"**
5. 在編輯器中，打開文件：`supabase/functions/learning-progress/index.ts`
6. **複製整個文件的內容**並貼上到編輯器中
7. 點擊 **"Deploy"** 按鈕
8. 等待部署完成（會顯示 "Deployed successfully"）

#### 方法 B: 使用 Supabase CLI（如果已安裝）

```bash
# 在項目根目錄執行
supabase functions deploy learning-progress
```

### 2.2 部署 ai-personalization Function

1. 在 Edge Functions 頁面，點擊 **"Create a new function"**
2. 函數名稱輸入：`ai-personalization`
3. 點擊 **"Create function"**
4. 打開文件：`supabase/functions/ai-personalization/index.ts`
5. **複製整個文件的內容**並貼上到編輯器中
6. 點擊 **"Deploy"** 按鈕
7. 等待部署完成

### 2.3 驗證 Functions 部署成功

1. 在 Edge Functions 頁面，您應該看到：
   - ✅ `learning-progress` - 狀態顯示為綠色（Active）
   - ✅ `ai-personalization` - 狀態顯示為綠色（Active）

---

## 步驟 3: 配置環境變量（如果需要）

### 3.1 檢查 Edge Functions 環境變量

1. 點擊 Edge Functions 頁面中的函數名稱
2. 點擊 **"Settings"** 標籤
3. 確認以下環境變量已自動設置：
   - `SUPABASE_URL` - 應該自動設置
   - `SUPABASE_ANON_KEY` - 應該自動設置
   - `SUPABASE_SERVICE_ROLE_KEY` - 如果需要，可以在 Project Settings > API 中找到

---

## 步驟 4: 測試功能

### 4.1 測試學習進度記錄

1. 打開您的應用（本地或部署的版本）
2. 登入帳號
3. 生成一個課程：
   - 選擇科目、年齡組、課程類型
   - 輸入主題
   - 點擊生成
4. 檢查數據庫：
   - 在 Supabase Dashboard > Database > Tables
   - 點擊 `user_lessons` 表
   - 點擊 **"View data"** 或 **"Browse"**
   - 應該能看到剛生成的課程記錄

### 4.2 測試行為追蹤

1. 在應用中切換語言
2. 檢查數據庫：
   - 打開 `user_behavior_logs` 表
   - 應該能看到 `language_changed` 的記錄

### 4.3 測試「我的學習」分頁

1. 在應用中點擊 **"我的學習"** 導航按鈕
2. 應該能看到：
   - 統計卡片顯示課程、故事、作業輔導數量
   - 課程記錄標籤顯示歷史記錄

### 4.4 測試 AI 個性化

1. 生成幾個不同類型的課程（例如：英語、數學）
2. 等待幾秒鐘讓系統分析
3. 再次生成課程時，AI 應該會根據您的偏好調整回應風格

---

## 步驟 5: 驗證 RLS 策略

### 5.1 檢查 Row Level Security

1. 在 Database > Tables 中，選擇任意一個新創建的表
2. 點擊 **"Policies"** 標籤
3. 確認每個表都有適當的 RLS 策略：
   - Users can view their own records
   - Users can insert their own records
   - Users can update their own records（如果適用）

---

## 🔍 故障排除

### 問題 1: SQL 執行失敗

**錯誤訊息：** "relation already exists"
- **解決方案：** 表已經存在，可以跳過或先刪除舊表

**錯誤訊息：** "permission denied"
- **解決方案：** 確保使用正確的數據庫用戶權限

### 問題 2: Edge Function 部署失敗

**錯誤訊息：** "Function not found"
- **解決方案：** 確保函數名稱正確，沒有拼寫錯誤

**錯誤訊息：** "Import error"
- **解決方案：** 檢查 `deno.json` 和 `tsconfig.json` 文件是否正確

### 問題 3: 行為追蹤不工作

**檢查清單：**
1. ✅ 確認用戶已登入
2. ✅ 檢查瀏覽器控制台是否有錯誤
3. ✅ 確認 Edge Function 已部署且狀態為 Active
4. ✅ 檢查 `user_behavior_logs` 表是否有新記錄

### 問題 4: 個性化提示詞不生效

**檢查清單：**
1. ✅ 確認 `ai-personalization` Edge Function 已部署
2. ✅ 檢查瀏覽器控制台的 Network 標籤，確認 API 調用成功
3. ✅ 確認用戶偏好已保存（檢查 `user_preferences` 表）

---

## 📊 監控和維護

### 定期檢查

1. **數據庫大小**：定期檢查表的大小，必要時清理舊數據
2. **Edge Function 日誌**：在 Edge Functions 頁面查看函數執行日誌
3. **用戶反饋**：定期查看 `ai_response_feedback` 表，了解用戶滿意度

### 性能優化

1. **索引**：所有表都已創建必要的索引，無需額外操作
2. **清理舊數據**：可以設置定期清理超過一定時間的行為日誌

---

## ✅ 完成檢查清單

部署完成後，確認以下項目：

- [ ] 所有數據庫表已創建
- [ ] 所有 Edge Functions 已部署且狀態為 Active
- [ ] 測試生成課程並確認記錄保存
- [ ] 測試「我的學習」分頁顯示數據
- [ ] 測試行為追蹤功能
- [ ] 檢查瀏覽器控制台無錯誤
- [ ] 確認 RLS 策略正常工作

---

## 🎉 完成！

恭喜！您已經成功部署了 AI 個性化學習與記憶系統。現在 AI 會自動學習和適應每個用戶的使用習慣，提供個性化的學習體驗。

如有任何問題，請查看 `AI_PERSONALIZATION_GUIDE.md` 獲取更多詳細信息。

