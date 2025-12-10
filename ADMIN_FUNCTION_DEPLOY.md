# 管理員 Edge Function 部署指南

## 🚀 快速部署（通過 Supabase Dashboard）

### 步驟 1: 創建 Edge Function

1. 前往 [Supabase Dashboard](https://app.supabase.com)
2. 選擇您的專案
3. 點擊左側菜單的 **Edge Functions**
4. 點擊右上角的 **Create a new function** 按鈕
5. 輸入函數名稱：`admin-management`
6. 點擊 **Create function**

### 步驟 2: 複製代碼

1. 打開項目中的文件：`supabase/functions/admin-management/index.ts`
2. 複製**全部內容**（全選 Cmd+A，複製 Cmd+C）
3. 在 Dashboard 的代碼編輯器中，刪除默認代碼，粘貼您複製的代碼

### 步驟 3: 確認環境變數（重要！）

確保以下環境變數已在 Supabase Dashboard 中設置：

1. 在 Edge Functions 頁面，點擊 **Secrets** 標籤（在代碼編輯器上方）
2. 確認以下環境變數已存在：
   - `SUPABASE_URL` - 您的 Supabase 專案 URL
   - `SUPABASE_ANON_KEY` - 您的 Supabase Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY` - 您的 Supabase Service Role Key（⚠️ 敏感密鑰）

如果缺少任何一個，請點擊 **Add new secret** 添加。

⚠️ **重要**：`SUPABASE_SERVICE_ROLE_KEY` 是必需的，因為管理員功能需要訪問所有用戶數據。

### 步驟 4: 部署

1. 點擊代碼編輯器右上角的 **Deploy** 按鈕（或按 Cmd+S）
2. 等待部署完成（通常幾秒鐘）
3. 看到 "Function deployed successfully" 消息

### 步驟 5: 驗證

部署完成後，Edge Function 的 URL 應該是：
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/admin-management
```

您可以在 Dashboard 中看到這個 URL。

---

## ✅ 部署完成後

1. 刷新您的網頁應用
2. 以 `rofi90@hotmail.com` 登入
3. 點擊「管理員」按鈕
4. 應該可以看到待審核用戶和已授權用戶列表

---

## 🐛 故障排除

### 問題：仍然顯示 "Failed to fetch"

**解決方案：**
1. 確認 Edge Function 已成功部署（在 Dashboard 中檢查）
2. 確認環境變數已正確設置
3. 檢查瀏覽器控制台的錯誤訊息
4. 確認您是以 `rofi90@hotmail.com` 登入的

### 問題：返回 403 Forbidden

**解決方案：**
- 確認您登入的郵箱是 `rofi90@hotmail.com`
- 只有這個郵箱可以訪問管理員功能

### 問題：返回 500 Internal Server Error

**解決方案：**
1. 檢查 Edge Function 的日誌（在 Dashboard 中）
2. 確認 `SUPABASE_SERVICE_ROLE_KEY` 已正確設置
3. 確認 Supabase 專案中的 `authorized_users` 表已創建

---

## 📝 檢查清單

部署前確認：
- [ ] Edge Function `admin-management` 已創建
- [ ] 代碼已複製並粘貼到 Dashboard
- [ ] `SUPABASE_URL` 環境變數已設置
- [ ] `SUPABASE_ANON_KEY` 環境變數已設置
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 環境變數已設置
- [ ] Edge Function 已成功部署
- [ ] 以 `rofi90@hotmail.com` 登入測試

---

## 🔗 相關文檔

- 完整的 Edge Function 代碼：`supabase/functions/admin-management/index.ts`
- 用戶授權設置：`USER_AUTHORIZATION_SETUP.md`
- 一般部署指南：`DEPLOY_GUIDE.md`

