# Todo PWA v1.0.0

手機優先的待辦事項 PWA，可直接部署到 GitHub Pages。

## 部署
1. 建立 GitHub Repository。
2. 將本資料夾所有檔案上傳到 repository 根目錄。
3. GitHub → Settings → Pages。
4. Source 選 Deploy from a branch。
5. Branch 選 main / root。
6. 開啟 GitHub Pages 網址即可。

## 資料保存
- 待辦、分類、優先級、設定：IndexedDB。
- Service Worker 更新只會更新網站快取，不會刪除 IndexedDB。
- 每次更新版本時，請同步修改：`version.js`、`version.json`、`service-worker.js` 的版本字串與 CACHE 名稱。

## 備份
- 匯出 JSON 包含待辦、分類、優先級、設定、schemaVersion、版本與 checksum。
- 匯入前會驗證資料結構與 checksum。
- 預設採合併模式，相同 task id 會保留 updatedAt 較新的版本。
