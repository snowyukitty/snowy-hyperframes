# HyperFrames 0.6.64 → 0.8.6 Upgrade Notes

更新日期：2026-08-22 · 實測機器：Windows 11、Node 24、FFmpeg 8.1.2、RTX 4090

2026-06 的四個 demo 都 pin 在 `hyperframes@0.6.64`。上游在 2026-08-17 發布 0.8.0，2026-08-21 發布 0.8.6，
並且改成「skills 優先、agent 驅動」的產品形態。這份筆記記錄我們實際升級時看到的每一件事，
以及為什麼 `shared/tools/hf.mjs` 長成現在這樣。

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
| `npx hyperframes transcribe`（word timings → captions） | 對應 `pi` 研究裡 WhisperX 的用途；可以給 `hf` 加一個 `captions --word-level` |
| `/media-use` skill（BGM、SFX、icon、voice、grade） | 研究影片下一層：BGM bed + voiceover carve（`/hyperframes-audio`） |
| `/faceless-explainer` skill（純 LLM 視覺的解說影片） | 與我們「研究型、zh-Hant、來源分層」的定位最接近；我們的 template 的無圖片模式就是這個方向的最小版 |
| `frame.md` / design presets、registry blocks（`data-chart`、`flowchart`、lower-thirds） | 下一步：把 `data-chart` / `flowchart` block 接進 template 的「內容區塊」 |
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

## 4. 不做的事

- 不重新 time 四個 2026-06 demo（它們的 MP4 已發布，時間軸與成片一致）；只做 `fit-audio` 與 vendor。
- 不把 0.8 的 cloud / lambda render 納入流程（本機 RTX 4090 足夠，且不花錢）。
- 不自動 bump 版本；每個專案明確 pin，升級要重跑 `check`。
