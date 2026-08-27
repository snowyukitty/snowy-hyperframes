# Retrospective — storyboard-to-video-pipeline-demo

日期：2026-08-22 · workflow：`claude`（Claude Code）· status：`ready-to-preview`

## 為什麼做這個 demo

2026-06 的四個 demo 各自帶著重複的 PowerShell / Node 檢查腳本、寫死的 slide 數、六份要手動同步的時間軸。
`pi` 專案的「MP3 比頁面長 → 旁白被切」事故就是同步失敗的直接後果。這個 demo 的用途只有一個：
用一個最小、零 bitmap、零 auth 的專案，證明新的 `shared/tools/hf.mjs` 可以從 storyboard 一路跑到 MP4，
而且每一步都能重跑、每一份時間軸都從同一個來源產生。

## 實際發生的事

1. `hf new claude/storyboard-to-video-pipeline-demo` → 從 template 產生可執行骨架（含 `vendor/gsap.min.js`、upstream 格式的 `hyperframes.json`）。
2. 寫 `data/storyboard.json`（6 頁）與 `data/pronunciation-map.json`（13 條）。
3. `hf html` → `index.html` 的 slide / audio 區塊由 storyboard 生成。
4. `hf pipeline` → 6 段 Edge-TTS、ffprobe 量測、timeline 77.2s、字幕、`project.json` 全部同步；audit 0 error。
5. `npx hyperframes@0.8.6 check` 第一次 **失敗**，兩個原因，都是 template 的問題、都已修：
   - `font_family_without_font_face`：CJK 字型堆疊沒有 `@font-face`。修法：對 OS 字型宣告 `src: local(...)`。
   - 我加的「大號浮水印數字」被當成文字：contrast 1.16:1 不及格，還被 caption 遮擋（`text_occluded`）。
     修法：改成純 SVG 進度環（沒有文字節點），順便讓畫面多一個有意義的視覺錨點。
6. 第二次 `check`：lint 0/0、runtime 0/0、layout 0、motion 0、contrast 18/18。`render` 33.8s 出 77.2s MP4。
7. 以 contact sheet（ffmpeg tile）逐頁目視：字型正確、字幕可讀、進度環隨頁推進、色相逐頁漂移。

## 學到的

- **上游 0.8 的 `check` 比 0.6 嚴格很多（字型、對比、遮擋），而且這是好事**：它抓到的都是真的視覺缺陷。
  新 template 現在預設通過。
- **裝飾性元素不要用文字做**；用 SVG shape，對比/遮擋檢查就不會誤判，畫面也更乾淨。
- **不要在 render 時依賴 CDN**：這台機器抓 jsDelivr 要 7.7 秒，`check` 的 10 秒 navigation timeout 直接爆掉；`hf vendor` 後問題消失。
- `hf sync` 的 `audio` policy（slide = max(target, mp3 + 0.6s)）配上「audio slot = MP3 實長」剛好對應上游新的
  `clip_media_fit` 規則：slot 不再比媒體長，也不會切到旁白。
- 純 HTML 視覺的研究型影片是可行的低成本路線（對照上游 `/faceless-explainer` 的思路），
  但資訊密度高的頁面仍需要圖表或 bitmap；下一步是在 template 裡加「卡片 / 指標 / 清單」三種內容區塊。

## 尚未完成 / 誠實標註

- 人工 preview gate **沒有做**（這是 agent session）：status 停在 `ready-to-preview`，render 只是技術驗證，
  不代表發布品質。聽過旁白、看過 preview 後才應把 status 改為 `rendered`。
- 沒有 BGM、沒有轉場（刻意，為了保持 demo 最小）。
- `docs/storyboard.md` 沒有另外寫：storyboard.json 已是唯一來源；若要給人讀，可由它產生。

## 2026-08-24 maintenance

- Upgraded the project pin to HyperFrames 0.8.11 and moved `npm run check` behind the hidden-window `hf check` wrapper.
- Regenerated slide/audio regions; every narration clip now belongs to the stable `voiceover` audio group.
- Verification: `hf audit` 0 errors / 0 warnings; `hyperframes check --strict` passed with lint, runtime, layout, and motion at 0 findings and 18/18 contrast checks passing.
- No render or human listening gate was performed; status remains `ready-to-preview`.

## 2026-08-27 — Milestone K language variants

- The project became the first two-locale fixture without being copied. Localizable storyboard fields
  now carry explicit `zh-Hant` and `en` values; English uses `en-US-JennyNeural` and its own pronunciation map.
- English synthesis produced six MP3s with engine word boundaries. ffprobe measured 67.73 seconds of
  narration; audio-driven sync produced a 77.0-second composition. Canonical timing remained 77.2 seconds.
  Each English clip now has a provider receipt binding text and voice parameters to SHA-256 hashes of the
  MP3 and word-boundary JSON.
- Each locale now owns audio, measured durations, timeline, slide and word captions, entry HTML, render
  target, offline review kit, and `project.json.deliverables` receipt.
- HyperFrames 0.8.16 caught two implementation defects before delivery: multiple root entries cannot be
  checked in one directory, and a renamed composition root must rename its `window.__timelines` key.
  Locale checks now use a one-entry ephemeral projection, and both failures have regression tests.
- Strict browser checks pass independently for both entries: zero lint/runtime/layout/motion findings and
  18/18 WCAG AA contrast checks each. Desktop and 390×844 mobile review-kit inspection found six frames,
  six audio controls, no horizontal overflow, and no browser console warnings.
- No render was produced. Both human gates remain `pending`; a verdict for one locale must never be copied
  to the other.
