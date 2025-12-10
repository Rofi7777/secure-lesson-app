# SQL 遷移文件執行說明

## 📁 文件說明

已為您準備了兩個優化後的 SQL 遷移文件：

1. **002_create_learning_progress_tables_optimized.sql** - 學習進度追蹤表
2. **003_create_user_learning_ai_tables_optimized.sql** - AI 個性化學習表

## ✨ 優化內容

### 已完成的優化：

1. ✅ **移除所有註釋** - 只保留有效的 Postgres 語法
2. ✅ **補齊 RLS 政策** - 所有表都有完整的 SELECT/INSERT/UPDATE/DELETE 政策
3. ✅ **添加外鍵約束** - 明確聲明所有外鍵關係
4. ✅ **優化索引** - 添加了更多性能索引
5. ✅ **添加 CHECK 約束** - 確保數據完整性
6. ✅ **事務處理** - 使用 BEGIN/COMMIT 確保原子性
7. ✅ **冪等性** - 使用 IF NOT EXISTS 和 DROP IF EXISTS，可安全重複執行
8. ✅ **安全性** - 所有函數使用 SECURITY DEFINER 和 search_path

## 🚀 執行步驟

### 在 Supabase Dashboard 執行：

1. **打開 SQL Editor**
   - 左側導航欄 → SQL Editor
   - 或點擊主頁的 "SQL Editor" 按鈕

2. **執行第一個遷移**
   - 點擊 "New query"
   - 打開 `002_create_learning_progress_tables_optimized.sql`
   - 複製全部內容（Ctrl+A / Cmd+A，然後 Ctrl+C / Cmd+C）
   - 貼上到 SQL Editor
   - 點擊 "Run"（或按 Ctrl+Enter / Cmd+Enter）
   - 等待執行完成，應該看到 "Success" 訊息

3. **執行第二個遷移**
   - 點擊 "New query"（創建新查詢）
   - 打開 `003_create_user_learning_ai_tables_optimized.sql`
   - 複製全部內容
   - 貼上到 SQL Editor
   - 點擊 "Run"
   - 等待執行完成

4. **驗證結果**
   - Database → Tables
   - 應該看到以下 10 個表：
     - `user_lessons`
     - `user_stories`
     - `user_tutoring_sessions`
     - `user_favorites`
     - `user_learning_stats`
     - `user_behavior_logs`
     - `user_preferences`
     - `ai_response_feedback`
     - `user_learning_profile`
     - `ai_user_memories`

## 📊 創建的對象

### 表（10個）
- 學習進度相關：5個表
- AI 個性化相關：5個表

### 索引（20+個）
- 用戶 ID 索引
- 時間戳索引
- 複合索引
- 外鍵索引

### RLS 政策（25+個）
- 每個表都有完整的 CRUD 政策
- 確保用戶只能訪問自己的數據

### 函數（3個）
- `update_user_learning_stats()` - 自動更新統計
- `update_user_preferences_from_behavior()` - 自動更新偏好
- `analyze_user_learning_style(UUID)` - 分析學習風格

### 觸發器（6個）
- 自動觸發統計更新
- 自動觸發偏好更新

## ⚠️ 注意事項

1. **執行順序很重要** - 必須先執行 002，再執行 003
2. **冪等性** - 文件可以安全地重複執行，不會產生錯誤
3. **數據安全** - 所有操作都在事務中，失敗會自動回滾
4. **RLS 已啟用** - 所有表都已啟用行級安全策略

## 🔍 故障排除

### 如果看到 "relation already exists" 錯誤
- 這是正常的，文件使用 `IF NOT EXISTS`，可以安全忽略
- 或者先執行 DROP TABLE 語句（不推薦，會丟失數據）

### 如果看到 "policy already exists" 錯誤
- 文件會自動刪除舊政策再創建新的，應該不會出現此錯誤
- 如果出現，可以手動刪除舊政策

### 如果看到權限錯誤
- 確保使用 Supabase Dashboard 的 SQL Editor（有完整權限）
- 不要使用應用程序的連接（只有 RLS 權限）

## ✅ 執行後檢查清單

- [ ] 兩個 SQL 文件都執行成功
- [ ] 所有 10 個表都已創建
- [ ] 所有索引都已創建（Database → Tables → 選擇表 → Indexes）
- [ ] 所有 RLS 政策都已創建（Database → Tables → 選擇表 → Policies）
- [ ] 所有函數都已創建（Database → Functions）
- [ ] 所有觸發器都已創建（Database → Tables → 選擇表 → Triggers）

## 🎯 下一步

執行完 SQL 遷移後，繼續部署 Edge Functions：
1. `learning-progress` Edge Function
2. `ai-personalization` Edge Function

詳見 `DEPLOYMENT_STEPS.md`

