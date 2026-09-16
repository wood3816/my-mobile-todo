# Todo PWA v1.0.3

v1.0.3 是依確認效果圖重新校正排版的版本，可直接部署到 GitHub Pages，不需建置工具。

## v1.0.3 重點
- 主畫面改成與效果圖相同的緊湊結構：Header → 5 頁籤 → 輸入框 → 分類/優先級/日期/＋ → 記事卡。
- 移除主畫面額外搜尋/計數列，避免和效果圖不同。
- 三點功能由底部抽屜改為卡片右側浮動選單。
- 分類/優先級、日曆、備份/版本頁重新依效果圖調整。
- 新增備份完整性檔案檢查與匯入「合併 / 取代」選擇。
- 維持同一 IndexedDB：`todo-pwa-db`，從 v1.0.0 更新不會刪除既有紀錄。

## GitHub Pages 部署
1. 解壓縮後，將資料夾內所有檔案上傳到 GitHub Repository 根目錄。
2. GitHub → Settings → Pages。
3. Source：Deploy from a branch。
4. Branch：`main` / `(root)`。
5. 等待 GitHub Pages 完成部署。

## 更新舊版
直接用 v1.0.3 檔案覆蓋 GitHub 上舊的網站程式檔即可。`service-worker.js` 使用新的快取名稱，但不會執行 `indexedDB.deleteDatabase()`，既有本機待辦資料會保留。

## 重要檔案
- `layout-config.css`：所有主要尺寸與顏色變數。
- `layout-spec.md`：版面數值說明。
- `db.js`：IndexedDB。
- `backup.js`：匯出、驗證、合併/取代匯入。
- `version.js` / `version.json`：版本檢查。
- `service-worker.js`：離線快取。

## v1.0.3 Bug 修復
- 修正主清單重新渲染時可能覆蓋日曆記事 checkbox / 三點選單事件。
- 修正更新 Service Worker 時偶爾需要重新整理兩次才套用新版的問題。
- 修正離線資源不存在時 Service Worker 可能錯誤回傳首頁 HTML 的問題。
- 修正使用者刪除全部分類或優先級後，重新開啟 App 又被自動建立預設值的問題。
- 系統深色/淺色模式在 App 開啟期間切換時，選擇「系統」會同步更新。
- 提升版本字串與備份檔格式驗證容錯。

## v1.0.3 介面修正

- 待辦卡片右側三點按鈕改用 `var(--text)`：淺色模式為黑色、深色模式為白色。
- 三點按鈕使用 `align-self:center`，在不同高度卡片中保持垂直置中。
- 完成勾選框使用 `align-self:center` 並移除上方位移，保持卡片高度中央。
- 沿用既有 `todo-pwa-db` IndexedDB，更新不清除舊紀錄。
