# HyperFrames 0.6.64 → 0.8.16 Upgrade Notes

Updated: 2026-08-27 · verified on Windows 11, Node 24, FFmpeg 8.1.2, RTX 4090

2026-06 的四個 demo 都 pin 在 `hyperframes@0.6.64`。上游在 2026-08-17 發布 0.8.0，2026-08-21 發布 0.8.6，
並且改成「skills 優先、agent 驅動」的產品形態。這份筆記記錄我們實際升級時看到的每一件事，
以及為什麼 `shared/tools/hf.mjs` 長成現在這樣。

## 0. Current baseline: 0.8.16

The repository moved from the proven 0.8.11 foundation to 0.8.16 only after an explicit compatibility
probe and a full strict run. Seven canonical compositions plus the first English locale deliverable pass
with zero lint, runtime, layout, or motion findings and 410/410 WCAG AA contrast checks.

Releases 0.8.12–0.8.16 matter here because they strengthen grouped audio behavior, preview lifecycle,
the lint/contract surface, deterministic font localization, render-stall handling, AAC muxing, phrase
cues, media `<source>` handling, and long-sequence/audio caching. The empirical gate—not the release
notes alone—is the reason 0.8.16 is now pinned.

Primary release records: [0.8.12](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.12),
[0.8.13](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.13),
[0.8.14](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.14),
[0.8.15](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.15), and
[0.8.16](https://github.com/heygen-com/hyperframes/releases/tag/v0.8.16).

Milestone K also exposed a new 0.8.16 contract: two root HTML files with composition IDs in one project
directory trigger `multiple_root_compositions`. `hf check` therefore projects exactly one locale entry
into an ignored temporary directory before launching the browser gate. Locale composition IDs and
`window.__timelines` keys are patched together; both behaviors have regression tests.

## 1. 結論先講

| 問題 | 答案（實測） |
| --- | --- |
| 0.6 時代的合成 HTML 在 0.8.6 還能 lint / check / render 嗎？ | **能。** 四個 demo 在加上 `vendor/gsap.min.js`、音訊 slot 對齊 MP3 後，`check` 全部 0 error / 0 warning（contrast 76/76、40/40、67/67、75/75 WCAG AA）。 |
| `validate` / `inspect` / `layout` 還能用嗎？ | 還能，但已是 deprecated alias；**新 script 一律用 `check`**（`check` 先跑 lint，再用一個 browser session 做 runtime / layout / motion / contrast）。 |
| 我們自己的 `hyperframes.json`（slide manifest）會衝突嗎？ | **會，但目前是潛在衝突。** 上游 `hyperframes.json` 是 `{registry, paths}` 且 `additionalProperties:false`，供 `hyperframes add` / registry 使用；`check` / `render` 目前不讀它，所以 `pi` demo 沒有因此失敗。為了不踩雷，Snowy manifest 改放 `data/timeline.json`（`pi` 的舊檔已移到 `data/manifest.json`），`hyperframes.json` 一律用上游格式。 |
| 為什麼 `check` 第一次在 Runtime 階段 `Navigation timeout of 10000 ms exceeded`？ | `index.html` 從 jsDelivr 載 GSAP，這台機器抓 CDN 要 **7.7 秒**，加上資產就超過 10 秒。把 GSAP vendored（`hf vendor`）後 Runtime 0 error。**結論：render/check 不要依賴 CDN。** |
| 新的 `clip_media_fit` 警告是什麼？ | 音訊 `data-duration` 比 MP3 長時，render 會把 slot 縮到媒體長度並警告。舊 demo 的 slot 都比 MP3 多 0.3–0.6s。`hf fit-audio`（保留 slide 視窗、把 audio slot 設為 MP3 實長）或 `hf sync`（新專案）都能消掉。 |
| 新的 lint `font_family_without_font_face`？ | 字型堆疊裡的每個 family 都要有 `@font-face`。OS 字型用 `src: local("Microsoft JhengHei")` 即可通過；要跨機器一致就 vendor `.woff2`。Template 已內建 local 宣告。 |
| contrast / `text_occluded` 檢查會誤判裝飾文字嗎？ | 會：低透明度的大號浮水印數字被判 1.16:1 不及格並被 caption 遮擋。**裝飾用 SVG shape，不要用文字。** |

## 2. 上游能力地圖（對我們有用的）

| 上游能力（0.8.x） | 我們的對應 / 態度 |
| --- | --- |
| `npx hyperframes check [--snapshots] [--strict]` | `npm run check` = `hf audit && hyperframes check` |
| `npx hyperframes doctor --json` | `npm run doctor`；CI 可用 `jq -e '.ok'` gate |
| `npx hyperframes snapshot --at t1,t2` | 取代我們用 ffmpeg 做 contact sheet 看 preview 的土法（兩者都好用） |
| `npx hyperframes tts`（**本機 Kokoro**，含 `zf_` / `zm_` 中文聲音，`--lang zh`） | 這就是 phase-summary-2026-06-03 想做的 Tier-1 Kokoro adapter；下一步直接拿來跑 8 段 golden samples 跟 Edge-TTS 對比，不必自己寫 adapter |
| `npx hyperframes transcribe`（word timings → captions） | **沒有採用**：需要下載 whisper 模型，而且會把剛唸出去的 zh-Hant 再轉錄一次。`hf captions` 改用 Edge-TTS 自己的 `WordBoundary`（見 `design-v2.md` §2C）；未來換非 Edge 引擎時它仍是備案。 |
| `/media-use` skill（BGM、SFX、icon、voice、grade） | 音樂床的**管線已完成並量測**（storyboard 宣告 `music`）；還缺的是實際樂曲——`/media-use` 需要 `heygen` CLI 登入，屬於帳號動作。動態 ducking 仍在 `/hyperframes-audio`。 |
| `/faceless-explainer` skill（純 LLM 視覺的解說影片） | 與我們「研究型、zh-Hant、來源分層」的定位最接近；我們的 template 的無圖片模式就是這個方向的最小版 |
| `frame.md` / design presets、registry blocks（`data-chart`、`flowchart`、lower-thirds） | 實測後修正（見 §3.5）：registry block 是**整頁 composition**，接不進行內的「內容區塊」。行內圖表要自己做 inline SVG（`design-v3.md` §2H），整頁資料頁才用 sub-composition（§2I）。 |
| skills：`npx skills add heygen-com/hyperframes --full-depth` | 建議在 Claude Code / Codex 安裝 core set；我們的 AGENTS.md 是 repo 規則，skills 是 HyperFrames 知識，兩者互補 |

## 3. 升級一個舊專案的步驟

```powershell
cd <workflow>/projects/<name>
# package.json：hyperframes@0.6.64 -> @0.8.6；check -> "hf audit && hyperframes check"；移除 validate/inspect
node ../../../shared/tools/hf.mjs vendor      # GSAP 本機化
node ../../../shared/tools/hf.mjs fit-audio   # audio slot = MP3 實長、root data-duration 對齊
node ../../../shared/tools/hf.mjs audit       # 0 error
npx --yes hyperframes@0.8.6 check             # 0 error
```

若專案自己有 `hyperframes.json` slide manifest：搬到 `data/manifest.json`（或改用 `hf sync` 產生的
`data/timeline.json`），並放一份上游格式的 `hyperframes.json`（見 template）。

## 3.5 Registry 實測（2026-08-22）

| 問題 | 答案（實測） |
| --- | --- |
| `npx hyperframes@0.8.6 add <name>` 能用嗎？ | **能。** `add data-chart` 約 10 秒完成，寫出 `compositions/data-chart.html` 並給出掛載片段。 |
| `catalog --query` 能用嗎？ | **不能。** 它會逐一抓取 registry 的每個項目，在這條連線上整批 timeout。要瀏覽目錄請看網站，然後用 `add <name>` 按名字安裝。 |
| registry block 可以放進我們的 block 版面嗎？ | **不行。** `data-chart` 是**整頁**（1920×1080、預設 15 秒、淺色 `--bg-color: #faf9f6`）的獨立 composition，用 `data-composition-src` 掛載。要放在標題與字幕旁邊的圖表，要自己做 inline SVG（見 `design-v3.md` §2H）。 |
| 裝進來就能 render 嗎？ | **要先 vendor。** 上游 block 自帶 CDN 的 GSAP `<script>`，正是會讓 `check` 逾時的東西。`hf vendor` 自 2026-08-22 起也會改寫 `compositions/*.html`，並自動算好 `../vendor/gsap.min.js` 的相對深度。 |

## 4. 不做的事

- 不重新 time 四個 2026-06 demo（它們的 MP4 已發布，時間軸與成片一致）；只做 `fit-audio` 與 vendor。
- 不把 0.8 的 cloud / lambda render 納入流程（本機 RTX 4090 足夠，且不花錢）。
- 不自動 bump 版本；每個專案明確 pin，升級要重跑 `check`。
