# Todo PWA 版面規格 v1.0.3

本版以確認過的「六畫面全展開效果圖」為視覺基準重新校正。主要版面數值集中於 `layout-config.css`，後續要改尺寸時優先改該檔案。

| 項目 | CSS 變數 | v1.0.3 預設值 |
|---|---|---:|
| App 最大寬度 | `--app-max-width` | 430px |
| 主畫面左右留白 | `--page-padding` | 12px |
| Header 高度 | `--header-height` | 48px |
| 頁籤高度 | `--tab-height` | 30px |
| 頁籤間距 | `--tab-gap` | 5px |
| 輸入框最小高度 | `--input-min-height` | 66px |
| 輸入框最大高度 | `--input-max-height` | 148px |
| 分類/優先級/日期高度 | `--control-height` | 36px |
| ＋ 按鈕尺寸 | `--add-size` | 36px |
| 記事卡最小高度 | `--task-min-height` | 58px |
| 記事卡垂直間距 | `--task-gap` | 5px |
| 記事卡上下內距 | `--task-padding-y` | 8px |
| 記事卡左右內距 | `--task-padding-x` | 9px |
| 記事卡圓角 | `--card-radius` | 9px |
| Checkbox 尺寸 | `--checkbox-size` | 19px |
| 標籤高度 | `--chip-height` | 18px |
| 標籤字體 | `--chip-font-size` | 10px |
| 左側選單寬度 | `--drawer-width` | min(79vw, 306px) |
| 三點功能選單寬度 | `--action-menu-width` | 138px |
| 一般本文字體 | `--font-md` | 14px |
| 標題字體 | `--font-lg` | 17px |
| 小字 | `--font-xs` | 11px |

## 主畫面位置邏輯
- Header：`38px / 自動 / 54px` 三欄，左側漢堡、中央標題、右側版本號。
- 五個頁籤：固定單列平均分配，不再切成水平捲動。
- 輸入框：獨立有框區塊，不再把輸入框與功能列包成一張大卡片。
- 功能列：輸入框下方 7px，依序為「分類 / 優先級 / 日期 / ＋」。
- 記事卡：`27px / 自動 / 30px` 三欄，左 Checkbox、中內容、右三點。
- 三點按鈕：按下後在按鈕附近顯示 138px 寬浮動選單，不使用底部抽屜。
- 版本號：主畫面底部 `Todo PWA · v1.0.3`。

## 手機響應
- 主目標：375–430px 寬的 Android / iPhone。
- 374px 以下：左右留白降為 9px、頁籤間距降為 3px、主文字 13px。
- 560px 以下 App 直接滿版，不顯示桌機外框陰影。
- iPhone 安全區：使用 `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`。

## 各頁面
### 左側選單
- 寬度：`min(79vw,306px)`。
- 頂部包含 App 圖示、名稱、說明及版本。
- 清單 / 日曆 / 備份與還原 / 頁籤管理 / 分類優先級 / 深色模式 / 檢查版本 / 關於。

### 分類 / 優先級
- 每列約 46px。
- 欄位：拖曳視覺標記 20px、色塊 24px、名稱自適應、修改 30px、刪除 30px。

### 日曆
- 固定 7 欄、6 週共 42 日期格。
- 今天使用淡藍底，選取日期使用主藍底。
- 日期下方圓點表示該日有待辦。

### 備份 / 版本
- 功能卡最小高度 57px。
- 圖示 28px、文字自適應、右箭頭 18px。
- 完整性成功提示使用綠色狀態卡。

## 後續調整建議
若要整體更緊湊：調 `--task-gap`、`--task-min-height`、`--page-padding`。
若要字體更大：調 `--font-md`、`--font-lg`，不建議直接修改各元件 CSS。
若要按鈕更大：調 `--control-height`、`--add-size`、`--checkbox-size`。


## v1.0.3 卡片控制項對齊

- `.check`：`align-self:center; margin-top:0`，垂直置中。
- `.more`：`align-self:center; margin-top:0; color:var(--text)`，垂直置中並跟隨主題文字色。
- 淺色模式 `--text:#111827`；深色模式 `--text:#f5f7fa`。
