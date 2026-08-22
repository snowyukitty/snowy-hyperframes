# block-vocabulary-reference

研究型 HyperFrames 影片的**內容區塊（blocks）字彙表**——每一種 block 各佔一頁，render 出來就是它實際的樣子。

新增一頁的資訊層時，先看這裡：挑一個 block、照 `data/storyboard.json` 的寫法填，`hf html` 會生成 HTML，
你不需要碰 `index.html`。

| block | 用來放 | 每頁建議量 |
| --- | --- | --- |
| `lead` | 一句話導語（≤ 60 字） | 1 |
| `metrics` | 數字（標籤 / 數值 / 註解） | 2–4 個 item |
| `cards` | 並列概念（標題 + 兩行說明） | 2–3 個 item |
| `list` | 步驟或清單（`ordered: true` 可編號） | 2–5 個 item |
| `quote` | 要占住畫面的一句話（可附 `source`） | 1 |
| `source` | 頁尾來源註記 | 1 |

一頁最多三個 block；超過就拆頁。`hf audit` 會用同一組上限檢查（`block-density` / `block-shape` / `block-type`）。

## 寫法

```jsonc
{
  "id": "slide-03", "title": "…", "chapter": "pipeline",
  "durationTarget": 14, "image": "", "subtitle": "字幕…", "narration": "旁白…",
  "blocks": [
    { "type": "lead", "text": "一句話。" },
    { "type": "metrics", "items": [
      { "label": "量測", "value": "ffprobe", "note": "每段 MP3 的實際秒數" },
      { "label": "回寫", "value": "hf sync", "note": "頁面、字幕、metadata 一次同步" } ] },
    { "type": "source", "text": "來源：…" }
  ]
}
```

- 有 `blocks` 的頁面會拿到 `with-blocks` class：標題縮到 60px、內容區變成上 92px 到下 220px 的整條版面、
  block 群組在剩餘空間裡置中對齊。
- `chapter` 會變成 `chapter-<slug>` class（有命名空間，所以 chapter 叫 `quote` 或 `list` 也不會誤套 block 樣式）。
- 沒有 `image` 的頁面用 template 內建的漸層背景；純 SVG 裝飾，不用文字，`hyperframes check` 的對比與遮擋檢查才不會誤判。

## 重跑

```powershell
npm run html && npm run pipeline && npm run check
npm run review        # 產生人工審核包（自帶畫格與旁白，可離線開）
```

這個專案的定位是**樣式回歸基準**，不是給觀眾看的影片：改動 template 的 `<style>` 之後，重跑
`npm run check` 與 `npx hyperframes@0.8.6 snapshot --at 5,15,25,35,45`，逐頁比對就知道有沒有改壞。
因此它的 `status` 雖然是 `ready-to-preview`，但除非要發布它的 render，人工 gate 可以先不做。

實測（2026-08-22，hyperframes 0.8.6）：lint 0/0、runtime 0/0、layout 0 issues / 9 samples、motion 0/0、
contrast **53/53 WCAG AA**。頁面上的每個數字都能在本 repo 裡驗證（`shared/tools/hf.mjs` 的
`BLOCK_TYPES` / `BLOCK_LIMITS`），所以 `sourceConfidence` 是 `not-applicable`。
