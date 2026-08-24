# Retrospective — block-vocabulary-reference

日期：2026-08-22 · workflow：`claude` · status：`ready-to-preview`

## 為什麼有這個專案

無 bitmap 的研究影片原本只有「標題 + 字幕」，資訊密度不足，於是 `hf html` 新增了 blocks 資訊層。
這個專案是它的字彙表：每種 block 各一頁，可以 render、可以 check，改動 template 時它就是視覺回歸測試。

## 過程中修掉的兩個真缺陷

1. **chapter class 與 block class 撞名。** storyboard 的 `chapter: "quote"` 原本會產生 `class="slide quote"`，
   於是整頁套上 `.quote` 的 `max-width: 1500px`，`hyperframes check` 直接報
   `container_overflow div.content ... overflowed right 263px`（1728 + 30 padding + 5 border − 1500 = 263，數字對得上）。
   修法：chapter class 一律加 `chapter-` 命名空間。
2. **第一版 block 太小、擠在畫面上方三分之一。** 1920×1080 的畫面留下大片空洞，遠看讀不到。
   修法：有 blocks 的頁面改用「上 92px 到下 220px 的整條版面 + block 群組置中」，數值放大到 66px，
   卡片標題 38px，並限制每格寬度（`--n * 470px`），避免兩欄時被拉成兩塊半空的看板。

## 誠實標註

- 人工 preview **未做**（agent session）；status 停在 `ready-to-preview`，`npm run render` 未執行。
- 頁面上的數字全部來自本 repo 自己的規則，不引用任何外部價格或配額——第一版曾放 TTS 價格表，
  後來換掉，因為那是未經本 session 查核的外部主張（AGENTS.md 規則 6）。

## 2026-08-24 maintenance

- Upgraded the project pin to HyperFrames 0.8.11 and routed `npm run check` through the hidden-window `hf check` wrapper.
- Regenerated the owned HTML/audio regions with semantic `voiceover` audio grouping.
- Inset line-chart endpoints by 10 px; 0.8.11 had correctly reported the final dot as clipped by 7 px.
- Verification: `hf audit` 0 errors / 0 warnings; `hyperframes check --strict` passed with runtime, layout, and motion at 0 findings and 54/54 contrast checks passing.
- Human preview remains pending; project status is unchanged.
