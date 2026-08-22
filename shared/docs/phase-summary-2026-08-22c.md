# Phase Summary — 2026-08-22 (三)：讓研究影片能 show 資料

接續 `phase-summary-2026-08-22b.md`。這一輪執行 `design-v3.md` 的里程碑，完成 **H（圖表）與 J（動態語彙）**；
**I（整頁資料頁）、K（雙語）、L（series identity）** 仍開放。

## 1. H — `chart` block：把比較畫出來

storyboard 多了一個 block 型別，三種圖：`bar`（2–6 項比較）、`split`（2–4 段比例）、
`line`（1–2 條線、每條最多 12 點）。由 `hf html` 生成、`hf audit` 檢查。

實作上做的四個決定：

1. **bar 與 split 是 HTML 盒子，只有 line 用 SVG。** 原本設計寫「全部 inline SVG」，但 SVG 對 CJK 標籤與
   等寬數字的排版很差，而一條 bar 本質上就是「一個方塊加旁邊一個數字」。SVG 只用在幾何本身就是內容的地方。
2. **所有填充都用 `transform` 動畫，不用 `width`**（width 動畫每一格都會重排版）；line 沿
   `pathLength="1"` 畫出來，不需要在 runtime 量幾何。
3. **截斷的座標軸會自己招認。** 只要圖表設了 `min`（line）或 `max`（bar），caption 會自動加上
   「（縱軸自 X 起）」。作者沒有辦法悄悄把軸拉近讓差距看起來更大——圖表每一次都會自己說出來。
4. **`source` 是必填**（缺少直接 error）：畫出來的比較，比說出來的主張更強，所以必須可追溯。

過程中的 bug 值得記住：第一版 line 圖畫出來是一段一段的虛線。原因是 viewBox 被非等比拉伸
（`preserveAspectRatio="none"`）又搭配 `vector-effect: non-scaling-stroke`，把 `pathLength` 的
dash 正規化弄壞了。改成用接近像素的使用者座標（1560×300）、維持等比縮放後就正常。

## 2. J — 動態語彙：四種到場方式

每頁可選 `motion`，全部實作在 template 的 timeline script 裡，`hf html` 只負責輸出 `data-motion`，
時間真相完全不受影響：

| 值 | 讀起來像 | 用在 |
| --- | --- | --- |
| `rise`（預設） | 現在的入場 | 一般內容頁 |
| `hold` | 只有背景動，文字已經在畫面上 | 延續上一頁的想法 |
| `focus` | 背景緩推、標題晚一點落下 | 開場、章節起點、收尾 |
| `reveal` | 證據在鋪陳句之後才出現 | 發現頁 |

**seek-safety 用該用的方法驗證**：在每一頁「起點 + 0.4 秒」各拍一張——`hold` 頁在 +0.4 秒已經完整、
`reveal` 頁只有標題還沒有證據、`focus` 頁還在沉降。每一格都只由絕對時間決定，與播放歷史無關，
這正是 renderer 依賴的性質。`check` 的 motion 階段 0 findings。

## 3. 研究影片升級

`measurable-vs-audible-tts` 的三頁改成用畫的：

- **語速**（第 4 頁）：兩條 bar，Kokoro 明顯短一截。
- **停頓**（第 5 頁）：bar，Kokoro 那條標成 `emphasis`（紅色）——「念得比較慢的那一個反而幾乎不停頓」這個
  反直覺結論，用一眼就看得出來的方式呈現。
- **拉丁縮寫**（第 6 頁）：line，八段逐段語速，第七段的凹陷直接看得見，不必用講的。

旁白一個字都沒改，所以沒有重新生成 TTS，時間軸也沒有變。動態方面：開場、限制頁、收尾用 `focus`，
四張發現頁用 `reveal`。

## 4. 驗證紀錄

| 檢查 | 結果 |
| --- | --- |
| `hf audit --all` | 8 專案、0 error |
| `hyperframes@0.8.6 check`（研究影片） | Check passed，對比度 **62/62 WCAG AA** |
| `hyperframes@0.8.6 check`（字彙表） | Check passed，對比度 **54/54 WCAG AA**，motion 0 findings |
| seek-safety | 八頁「起點 +0.4s」逐頁確認，行為與各自的 motion 一致 |
| render | 210.5s、1920×1080 30fps、14.1 MB、1m21s |
| 人工 preview | **仍未做**——審核包已更新並重新發布到同一個 URL |

## 5. Stop point

乾淨。`design-v3.md` 的 H 與 J 標記為已建成並附上 as-built 決定；`TODO.md` 更新；審核包已重新產生。
下一次接手仍然從 `TODO.md` → `design-v3.md` 開始。
