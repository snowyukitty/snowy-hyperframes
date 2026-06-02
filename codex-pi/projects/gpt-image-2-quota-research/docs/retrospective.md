# Retrospective

本文件記錄 `gpt-image-2-quota-research` 這個具體專案的工具、困難、經驗教訓與可調參數。通用 workflow 規則放在 `codex-pi/README.md`。

## Tools Used

| Tool | Purpose |
| --- | --- |
| Codex | 統籌流程、建立檔案、查資料、整理來源、寫 HyperFrames HTML。 |
| Codex image generation | 生成 16:9 科技調研風格圖片素材，並複製到專案 `assets/images/`。 |
| Web research | 查官方 OpenAI Help、ChatGPT Pricing、OpenAI API Docs，以及社群來源。 |
| HyperFrames CLI `0.6.64` | 初始化專案、lint、validate、inspect。 |
| Edge-TTS `7.2.8` | 產生逐頁繁體中文旁白 MP3。 |
| FFmpeg / FFprobe | 檢查音訊長度，協助對齊約 2 分鐘分鏡。 |
| PowerShell | 建立資料夾、移動檔案、執行 TTS 與檢查。 |
| Pi packages | 已安裝 Tavily、pi-docparser、pi-codex-image-gen；本專案保留 Pi 可接手結構。 |

## Problems Solved

| Problem | Resolution |
| --- | --- |
| Pi Git Bash 環境先前會落到 WSL bash。 | 修正 Pi `settings.json` 的 BOM 與 `shellPath`，指向 Git Bash。 |
| Pi 尚未有 `openai-codex` auth，不能自行 `codex_generate_image`。 | 本輪使用 Codex 內建 image generation 產圖；把 prompts 保存到 `data/image-prompts.json`，之後 Pi 登入後可重生。 |
| OpenAI 沒公開 Free/Plus/Pro 每日固定生圖數。 | 把所有數字標為官方、社群回報或估算值，不把估算包裝成官方配額。 |
| Edge-TTS 參數以 `--rate -5%` 傳入會被 CLI 誤解析。 | 改成 `--rate=+8%`、`--pitch=-2Hz` 形式。 |
| 中英文混讀時，產品名與縮寫發音不自然。 | 新增 `data/pronunciation-map.json`，把螢幕字幕稿與 TTS 發音稿拆開，`npm run tts` 會先生成 `slide-*.tts.txt`。 |
| 初版配音總長約 132 秒，超出目標。 | 將 Edge-TTS rate 調到 `+8%`，再依重生後音訊把 timeline 調整到約 122 秒。 |
| HyperFrames audio clip 沒有 `id` 會導致 render 靜音。 | 為每個 audio clip 加上穩定 ID：`audio-slide-01` 到 `audio-slide-07`。 |
| 重複引用背景圖與 track 太密造成 lint warnings。 | 為每頁複製穩定圖片檔名並分散 track index。 |
| 背景圖動畫縮放造成 layout overflow warning。 | 以 `data-layout-allow-overflow` 標記為刻意設計。 |

## Lessons Learned

- 研究型簡報必須把「官方已公開」、「社群回報」、「合理推估」分層存放，否則日後更新容易混淆。
- 圖片素材不要把文字烤進圖裡；文字用 HTML overlay，方便換語言、換數字、換來源。
- TTS 最好每頁一個音訊檔，便於替換單頁、對齊字幕與調整時間。
- 中英混讀不要直接依賴 Edge-TTS 自訂 SSML；目前可靠做法是 pronunciation map 前處理。
- 螢幕字幕與 TTS 發音稿要分離：字幕保持給人看的正式詞，發音稿才使用 `G P T`、`Open A I` 這類拼讀。
- HyperFrames 專案要先 `npm run check`，不要等 render 後才找音訊或 layout 問題。
- 若希望 Pi 之後可自主生圖，必須先完成 Pi 的 `openai-codex` login；GitHub Copilot auth 不能替代 `codex_generate_image` 需要的 auth。

## Adjustable Parameters

| Parameter | Location | Current Value | Notes |
| --- | --- | --- | --- |
| Voice | `scripts/generate-tts.ps1`, `data/storyboard.json` | `zh-TW-HsiaoChenNeural` | 可改成 `zh-TW-HsiaoYuNeural` 或 `zh-TW-YunJheNeural`。 |
| TTS rate | `scripts/generate-tts.ps1`, `data/storyboard.json` | `+8%` | 降低會更自然但更長；提高可壓縮總時長。 |
| TTS pitch | `scripts/generate-tts.ps1`, `data/storyboard.json` | `-2Hz` | 稍微降低尖銳感。 |
| Pronunciation map | `data/pronunciation-map.json` | Display/TTS split | 控制 `GPT-Image-2`、`OpenAI`、`API`、`Free/Plus/Pro` 等中英混讀發音。 |
| Total duration | `index.html` root `data-duration` | `122` | 修改後需同步 SRT 與 slide start/duration。 |
| Slide timing | `index.html`, `captions/narration.srt`, `data/storyboard.json` | 7 slides | 變更旁白後建議用 FFprobe 重新估算。 |
| Safe daily recommendations | `data/research.json`, `index.html`, `docs/references.md` | Free 1-3, Plus 10-30, Pro 50-150 | 這些是估算值，需隨官方資料更新。 |
| Image prompts | `data/image-prompts.json` | 3 prompts | Pi 登入 `openai-codex` 後可用 `codex_generate_image` 重生。 |
| Render output | `package.json` | `renders/gpt-image-2-quota-research.mp4` | 可依專案命名調整。 |

## Follow-Up Improvements

- 將 SRT 生成自動化，避免手動同步旁白與字幕。
- 將 `ffprobe` 音訊長度檢查做成腳本，產生 timeline JSON。
- 新增 voice A/B test 腳本，比較 `zh-TW-HsiaoChenNeural`、`zh-TW-HsiaoYuNeural` 與多語 voice 在技術詞上的表現。
- 若需要逐字級字幕或更精準時間，可評估 Edge-TTS `--write-subtitles`、WhisperX 或 Montreal Forced Aligner。
- 若後續 Pi 完成 `openai-codex` login，可新增一個 `pi/projects/...` 版本，測試 Pi 自主生成圖片的流程。
- 為繁中 render 補專案內嵌字型，避免不同機器 fallback 字型差異。
