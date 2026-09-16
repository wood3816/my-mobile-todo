# Todo PWA 版面規格 v1.0.0

所有主要數值集中在 `layout-config.css`。

| 項目 | CSS 變數 | 預設值 |
|---|---|---:|
| 頁面最大寬度 | `--page-max-width` | 520px |
| 頁面左右留白 | `--page-padding` | 12px |
| Header 高度 | `--header-height` | 54px |
| 頁籤高度 | `--tab-height` | 38px |
| 輸入框最小高度 | `--input-min-height` | 54px |
| 輸入框最大高度 | `--input-max-height` | 150px |
| 下拉/日期高度 | `--control-height` | 40px |
| 待辦卡最小高度 | `--task-min-height` | 62px |
| 待辦卡間距 | `--task-gap` | 6px |
| 卡片圓角 | `--card-radius` | 12px |
| 面板圓角 | `--panel-radius` | 16px |
| Checkbox 尺寸 | `--checkbox-size` | 21px |
| 圖示基準尺寸 | `--icon-size` | 22px |
| 標籤高度 | `--chip-height` | 22px |
| XS 字體 | `--font-xs` | 12px |
| SM 字體 | `--font-sm` | 13px |
| MD 字體 | `--font-md` | 16px |
| LG 字體 | `--font-lg` | 18px |
| XL 字體 | `--font-xl` | 22px |
| 底部安全區 | `--safe-bottom` | env(safe-area-inset-bottom) |
| 頂部安全區 | `--safe-top` | env(safe-area-inset-top) |

## 版面定位
- `.app`: 手機主容器，最大 520px，桌機置中。
- `.topbar`: 3 欄 Grid：左側功能鍵 42px / 中央標題 / 右側版本。
- `.tabs`: 水平滾動，避免 5 個頁籤在窄螢幕擠壓。
- `.composer-controls`: 一般為 4 欄（分類 / 優先級 / 日期 / 新增）；380px 以下切為 2 欄。
- `.task`: 3 欄 Grid：30px checkbox / 自適應內容 / 36px 更多按鈕。
- `.drawer`: 左側抽屜寬 `min(82vw, 330px)`。
- `.sheet`: 底部操作選單，最大寬度 520px。
- `.footer`: 固定於底部安全區上方。

## 建議後續調整入口
若覺得畫面太擠，優先調整：
- `--page-padding`
- `--task-gap`
- `--task-min-height`
- `--font-md`
- `--tab-height`

若覺得按鈕太小，優先調整：
- `--control-height`
- `--checkbox-size`
- `.icon-btn` 的 width / height
