# HyperFrames Production Playbook

本文件整理 Snowy HyperFrames 到目前為止的實作經驗。它不是單一專案說明，而是之後做 `codex`、`codex-pi`、`pi` 三種 workflow 時可以復用的製作手冊。

更新日期：2026-06-02

## 1. 工作區模型

根目錄依「誰主導製作流程」分成三條 workflow：

```text
snowy-hyperframes/
├── codex/
│   └── projects/
├── codex-pi/
│   └── projects/
├── pi/
│   └── projects/
└── shared/
    ├── docs/
    ├── schemas/
    └── templates/
```

### `codex`

Codex 直接完成 research、資料結構、圖片生成、Edge-TTS、HyperFrames HTML、檢查與渲染。適合需要高整合度、快速產出、並且不依賴 Pi auth 的專案。

### `codex-pi`

Codex 統籌，Pi 或 Pi-compatible packages 可作為輔助工具。圖片可先使用 Codex 內建 image generation，並把 prompts 保存好，之後 Pi 完成 `openai-codex` login 後可重跑生成流程。

### `pi`

Pi 主導執行，重點是測試 Pi packages、GitHub Copilot / provider auth、CLI automation，以及能否在 Pi 內自主完成 research-to-video 工作流。

### 共用原則

- 具體影片或簡報專案一律放在對應 workflow 的 `projects/<project-name>/`。
- 專案內保存資料、提示詞、音訊、字幕、圖片與 runbook。
- 不在 repo 內保存 API key、OAuth token 或私人 auth 檔。
- 所有可復用規範放在 `shared/`。

## 2. 已完成工作總結

| Project | Workflow | Status | 重點成果 |
| --- | --- | --- | --- |
| `codex-pi/projects/gpt-image-2-quota-research` | `codex-pi` | `ready-to-render` | 研究 GPT-Image-2 在 Free / Plus / Pro 下的合理每日生圖量；嚴格區分官方、社群回報、估算；完成 TTS、字幕、圖片與 HyperFrames 專案。 |
| `codex/projects/ai-tool-cost-benchmark` | `codex` | `ready-to-render` | 比較 Codex、Pi + GitHub Copilot、Claude Code 做 research-to-video 的成本與能力邊界；建立 cost-model 思路。 |
| `codex/projects/ai-2030-three-futures` | `codex` | `rendered` | 製作 2030 樂觀 / 一般 / 悲觀三情境研究影片；完成 15 頁、約 5 分鐘影片；已輸出 MP4。 |
| `pi/projects/latest-tts-voice-clone-research` | `pi` | `rendered` | Pi 主導完成 TTS / AI voice clone 研究影片；生成 11 張圖、11 段 Edge-TTS MP3、字幕、audio audit 與 no-cut render。 |

目前最完整的渲染輸出：

```text
codex/projects/ai-2030-three-futures/renders/ai-2030-three-futures.mp4
duration: 308.054s
video: 1920x1080, 30fps, H.264
audio: AAC stereo, 48kHz
size: 44,649,770 bytes

pi/projects/latest-tts-voice-clone-research/renders/latest-tts-voice-clone-research-nocut.mp4
duration: audio-driven no-cut timeline
status: demo/reference render
```

各專案的細節與個別教訓記錄在各自的：

```text
docs/retrospective.md
docs/runbook.md
```

## 3. 標準專案契約

每個正式 HyperFrames 專案建議至少包含（`hf new` 會產生；`hyperframes.json` 是 **HyperFrames 自己的** registry/paths 設定，
Snowy 的時間軸 manifest 是 `data/timeline.json`）：

```text
project.json
package.json
hyperframes.json
data/timeline.json
index.html
data/
  research.json
  storyboard.json
  image-prompts.json
  pronunciation-map.json
docs/
  references.md
  storyboard.md
  edge-tts.md
  runbook.md
  retrospective.md
assets/
  images/
  audio/
captions/
  narration.srt
renders/
scripts/
  prepare-tts.ps1
  generate-tts.ps1
```

可從共用模板開始：

```text
shared/templates/hyperframes-research-project/
```

`project.json` 是每個專案的索引，至少應記錄：

- `workflow`: `codex`、`codex-pi` 或 `pi`
- `status`: `draft`、`ready-to-preview`、`ready-to-render`、`rendered`、`archived`
- `tools`: 實際用到的工具與版本
- `auth.required`: 需要哪些 auth，但不存 token
- `imageGeneration`: 圖片來源、provider、是否可重生
- `paths`: entry、research、storyboard、references、render output
- `checks`: 最近一次 `npm run check` 結果與 render 狀態

## 4. 推薦製作流程

> **2026-08-22 起**：以下 4.5 / 4.6 / 4.8 的手動步驟已由 `shared/tools/hf.mjs` 實作（`prepare-tts` / `tts` / `measure` / `sync` / `audit`），
> 請直接跑 `npm run pipeline` 與 `npm run check`；本節保留為原理說明。升級到 HyperFrames 0.8 的實測見
> `shared/docs/hyperframes-0.8-upgrade-notes.md`（`check` 取代 `validate/inspect`、GSAP 要 vendor、audio slot = MP3 實長、CJK 字型要 `@font-face`）。

### 4.1 定義範圍

先確認：

- 這次用哪條 workflow：`codex`、`codex-pi`、`pi`
- 是否需要最終 render
- 預期長度與頁數
- 資料可信度要求
- 圖片由誰生成
- TTS 是否需要中英混讀優化

若題目會隨時間改變，例如價格、配額、模型能力、政策、產品方案，必須重新查最新資料。

### 4.2 Research

資料至少拆成三層：

- 官方已公開資訊
- 社群實測或使用者回報
- 合理推估或情境假設

保存到：

```text
data/research.json
docs/references.md
```

高風險規則：

- 不把未公開限制寫成官方配額。
- 不用單一社群貼文代表穩定事實。
- 未能查到官方明確數字時，標示為「估算值」或「推測值」。
- 對未來題材使用「情境」語氣，不寫成確定預言。

### 4.3 Storyboard

先寫分鏡與旁白，再定圖片。

每頁至少有：

- slide id
- title
- chapter 或 section
- target duration
- visual direction
- narration
- subtitle
- source notes

同步維護：

```text
data/storyboard.json
docs/storyboard.md
captions/narration.srt
index.html
```

### 4.4 圖片

圖片必須保存在專案內：

```text
assets/images/
```

不要直接引用 Codex 會話暫存路徑或外部下載臨時路徑。

推薦做法：

- `data/image-prompts.json` 保存完整 prompt。
- 生成 16:9 bitmap image，風格依專案定義。
- 重要文字、數字、來源不要烤進圖片，改用 HTML overlay。
- 同一張概念圖若要多頁使用，複製成 slide-specific 檔名。

例：

```text
assets/images/optimistic-city-source.png
assets/images/slide-04-optimistic-city.png
```

這可以避免 HyperFrames duplicate media discovery warning，也方便逐頁替換。

### 4.5 Edge-TTS

採用 display / TTS split：

```text
assets/audio/slide-01.display.txt
assets/audio/slide-01.tts.txt
assets/audio/slide-01.mp3
data/pronunciation-map.json
```

螢幕字幕使用自然給人看的文字；TTS 文字由 pronunciation map 轉換，讓中英混讀更自然。

目前效果較穩定的設定：

```text
voice:  zh-TW-HsiaoChenNeural
rate:   +5% 到 +8%
pitch:  -2Hz 到 -3Hz
volume: +0%
```

PowerShell / edge-tts 參數建議用 equals 形式：

```powershell
edge-tts --voice zh-TW-HsiaoChenNeural --rate=+8% --pitch=-2Hz --text "..." --write-media output.mp3
```

不要依賴 Edge-TTS 自訂 SSML 來處理 `<phoneme>`、`<say-as>` 或 lexicon。若需要精準 phoneme、alias、語言標籤與發音 QA，改用 Azure Speech 或其他完整 SSML provider。

#### 4.5.1 一條語音母版，多條可選字幕

若交付要求是「英語聲音，英語預設字幕，另附日語與繁中」，不要建立三個 spoken locale
variant，也不要把英語字幕烤進畫面。使用 `subtitleTracks`：

1. canonical `language` 與 `subtitleTracks.sourceLocale` 都設為英語；只生成這條語音。
2. 每頁的 `captionCues` 用穩定 cue ID，把英語旁白完整切段；同一 cue 內附日語與繁中。
3. `hf pipeline` 只從英語 word boundaries 建一次時間碼，再寫出每語言的 SRT/VTT。
4. `hf audit` 會阻擋缺譯、原文漂移、手改時間碼、hash/receipt 漂移與超出語言密度上限。
5. `hf review` 逐語言切換；除了英語發音、節奏、整體可讀性，每頁的每條字幕都必須通過。

```jsonc
"subtitleTracks": {
  "sourceLocale": "en",
  "default": "en",
  "tracks": {
    "en":      { "label": "English", "maxChars": 96 },
    "ja":      { "label": "日本語", "maxChars": 60 },
    "zh-Hant": { "label": "繁體中文", "maxChars": 48 }
  }
}
```

產物是 `captions/subtitles.<locale>.srt` 與 `.vtt`。發布時保留乾淨 MP4，將三語 sidecar
一併放 GitHub Release；網站用 `<track kind="subtitles" srclang="…">` 提供選擇。需要單檔可攜
版本時，可在人工 gate 後另做 MKV（多軌最可靠）或 MP4 `mov_text` mux，但 mux 不是來源真相，
也不能取代 sidecar 與 review receipt。

### 4.6 測量音訊與同步時間線

**硬規則：不要用預估 storyboard 秒數直接 render。** 生成 MP3 後，必須先用 `ffprobe` 量實際秒數，再決定是縮短旁白、加速 TTS，還是延長 slide。否則 HyperFrames 會依 `data-duration` 強制停止音軌，造成突兀截斷。

生成 MP3 後，用 `ffprobe` 量實際秒數：

```powershell
Get-ChildItem assets\audio -Filter 'slide-*.mp3' | Sort-Object Name | ForEach-Object {
  $d = ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 $_.FullName
  '{0} {1:N3}s' -f $_.Name, [double]$d
}
```

需要同步更新：

- `index.html` 根元素 `data-duration`
- 每頁 slide 的 `data-start` / `data-duration`
- 每個 audio clip 的 `data-start` / `data-duration`
- GSAP timeline start array
- `captions/narration.srt`
- `data/storyboard.json`
- `project.json` 的 `durationSeconds`

若 HyperFrames 報告同一 track 上有極小浮點數 overlap，可把每個 audio clip 分配到不同 `data-track-index`。

建議每個專案加入 audio audit script，例如：

```text
npm run audio:audit
```

檢查邏輯：每個 `slide-XX.mp3` 的實際長度必須小於或等於該 slide 的 timeline duration。正式 `npm run check` 應該包含 audio audit。

### 4.7 HyperFrames HTML

目前穩定的視覺模式：

- full-bleed 16:9 背景圖
- 深色 overlay gradient 保證字幕可讀
- chapter badge 或短標題
- 下三分之一字幕區
- 來源與數字用 HTML overlay
- 避免 cards inside cards
- 避免把影片第一屏做成 landing page

動畫上，GSAP selector 要做防呆，避免 optional element 不存在時產生 warning：

```js
const addIfFound = (selector, vars, position) => {
  const targets = document.querySelectorAll(selector);
  if (targets.length > 0) {
    tl.from(targets, vars, position);
  }
};
```

### 4.8 驗證、預覽與渲染

Render 不是第一個 review artifact。正式 render 前應先進入 preview gate：

1. `npm run check`
2. `npm run preview` 或 `npm run dev`
3. 人工在瀏覽器預覽完整節奏，至少抽查所有 slide 的開頭、中段、結尾
4. 確認無音頻截斷、無 native audio controls、無明顯圖片錯配
5. 才執行 `npm run render`

每個專案都先執行：

```powershell
npm run check
```

目標：

```text
0 lint errors
0 lint warnings
0 layout issues
```

目前遇到的 Headless Chrome AudioContext warning 通常不阻塞 render：

```text
The AudioContext was not allowed to start...
```

預覽：

```powershell
npm run dev
```

渲染：

```powershell
npm run render
```

渲染後檢查：

```powershell
ffprobe -v error -show_entries format=duration,size -show_streams -of json renders\<file>.mp4
```

可選 contact sheet：

```powershell
ffmpeg -y -i renders\<file>.mp4 -vf "fps=1/20,scale=320:-1,tile=5x4" -frames:v 1 renders\contact-sheet.jpg
```

## 4.9 音樂床（2026-08-22 新增）

storyboard 宣告 `music: { file, volume }` 即可，由 `hf html` 生成 `<audio id="bgm" data-track-index="19">`。

實測對照（210 秒成片、ffmpeg `ebur128` 量測）：

| 床本身 | volume | 成片中的床 | 旁白 | 相差 |
| ---: | ---: | ---: | ---: | ---: |
| −20 LUFS | 0.14 | −37.7 LUFS | −15.8 LUFS | 22 dB |

兩個會讓人以為「功能壞掉」的陷阱：

1. **床本身太安靜**：第一次驗證用的床是 −52 LUFS，乘上 0.14 之後等於靜音。`hf audit` 現在會用
   「床的響度 + 20·log10(volume)」預估落點，低於 −48 LUFS 就警告。
2. **床比全片短**：HyperFrames 會把 slot 縮到媒體長度（`clip_media_fit`），後面就沒有音樂了；
   `hf audit` 會直接報 error。

## 5. 已解決問題與經驗教訓

| 問題 | 解法 |
| --- | --- |
| Pi 使用錯誤 shell 或設定檔解析失敗。 | 移除 Pi `settings.json` 的 UTF-8 BOM，並將 `shellPath` 指到 Git Bash。 |
| GitHub Copilot auth 不能讓 Pi 調用 Codex 生圖。 | Pi 要調 `codex_generate_image` 仍需要 `openai-codex` auth；Copilot auth 只能支撐 Copilot 相關能力。 |
| OpenAI 未公開明確 daily quota。 | 只把官方公開資料寫成官方事實；其他數字標為社群回報或估算。 |
| 中英混讀 TTS 不自然。 | 拆分 `.display.txt` 和 `.tts.txt`，用 `data/pronunciation-map.json` 做前處理。 |
| Edge-TTS rate / pitch 被 CLI 誤解析。 | 使用 `--rate=+8%`、`--pitch=-2Hz` 這種 equals 形式。 |
| TTS 總長與 storyboard 不一致。 | 每次重生 MP3 後用 `ffprobe` 重新量，然後同步 HTML/SRT/storyboard。 |
| MP3 比 slide duration 長，render 後旁白被突兀截斷。 | 新增 `audio:audit`，讓 `npm run check` 在 render 前失敗；或改成 audio-driven timeline，讓 slide duration 跟隨 MP3 實測長度。 |
| Native HTML audio controls 被 render 進畫面。 | audio elements 只作 render 音軌 discovery，使用 CSS 隱藏 controls；不要在 final composition 顯示原生控制條。 |
| HyperFrames audio clip 沒 id 導致 render 靜音風險。 | 每個 audio clip 設穩定 `id`，例如 `audio-slide-01`。 |
| 重複圖片造成 media discovery warning。 | 每頁使用 slide-specific 圖片副本。 |
| 背景動畫縮放造成 layout overflow warning。 | 確認是刻意設計後，用 `data-layout-allow-overflow` 標記。 |
| 字型 warning。 | 使用 `system-ui, sans-serif`，或把字型放進專案並用 `@font-face` 嵌入。 |
| GSAP target warning。 | 使用 `addIfFound` 等防呆 helper。 |
| audio track 浮點數重疊。 | 使用不同 `data-track-index`，或留下極小 gap。 |

## 6. 可調參數

| 類別 | 參數 | 建議範圍 / 做法 |
| --- | --- | --- |
| TTS voice | `zh-TW-HsiaoChenNeural` | 目前預設；可 A/B test `zh-TW-HsiaoYuNeural`、`zh-TW-YunJheNeural`。 |
| TTS rate | `+5%` 到 `+8%` | `+5%` 較自然，`+8%` 適合壓縮片長。 |
| TTS pitch | `-2Hz` 到 `-3Hz` | 可降低尖銳感。 |
| 圖片比例 | 16:9 | 適合 1920x1080 HyperFrames 影片。 |
| 圖片文字 | 不烤字 | 文字、數字、來源都用 HTML。 |
| 字幕位置 | lower-third | 避免遮擋主視覺，保留足夠 safe area。 |
| slide duration | 依 MP3 實測 | 不要只用預估秒數。 |
| render fps | 30fps | 目前研究影片足夠；若做高動態影片再提高。 |
| preview | `npm run dev` | 先人工看節奏與字幕。 |
| validation | `npm run check` | 交付前必要步驟。 |

## 7. Quality Checklist

Research:

- 來源已更新到製作當日附近。
- 官方 / 社群 / 估算分層清楚。
- 關鍵數字有來源或明確標示推估。
- `docs/references.md` 可讀。

Storyboard:

- 每頁 title、subtitle、narration、duration 完整。
- `data/storyboard.json` 與 `docs/storyboard.md` 一致。
- 最終結論頁清楚。

Images:

- 所有圖片在 `assets/images/`。
- `data/image-prompts.json` 保存 prompts。
- 圖中沒有關鍵文字或數字。
- 同一圖片多頁使用時有 slide-specific copy。

Audio / subtitles:

- `.display.txt`、`.tts.txt`、`.mp3` 成對存在。
- pronunciation map 覆蓋主要中英混讀詞。
- SRT 使用給觀眾看的文字。
- MP3 秒數已用 `ffprobe` 檢查。
- `npm run audio:audit` 通過，確認沒有音頻截斷風險。

HyperFrames:

- audio clips 有穩定 id。
- timeline 和 SRT 同步。
- `npm run check` 達到 0 errors / 0 warnings / 0 layout issues，且包含 audio audit。
- render 前已用 `npm run preview` / `npm run dev` 做人工預覽。
- render 指令寫入 `docs/runbook.md`。

Render:

- MP4 輸出存在。
- `ffprobe` 已確認音訊、視訊、總時長。
- 必要時產生 contact sheet 做快速視覺 QA。
- `project.json` 更新 status 與 render output。

Documentation:

- `docs/runbook.md` 記錄如何重跑。
- `docs/retrospective.md` 記錄踩坑、工具、後續改進。
- 不記錄 token 或私密 auth。

Publication:

- 目前 demo project 可以上傳 GitHub 作為 reference。
- 未來 production/client project 預設不進 GitHub，只上傳 workflow、教育材料、工具使用經驗與可公開模板。
- 新 demo 要公開前，先按照 `shared/docs/repo-publication-policy.md` 審核並加入 `.gitignore` allowlist。

## 8. 建議後續改進

優先級高：

- 做一個共用腳本，自動從 MP3 秒數生成 SRT、HTML timeline 與 storyboard timing。
- 建立 `shared/schemas/cost-ledger.schema.json`，統一記錄工具、圖片數、音訊長度、render 次數、API 或 subscription 成本。
- 補一份 `.gitignore` 標準，避免大量 `renders/work-*`、captured frames、暫存 logs 進入版本控制。

優先級中：

- 建立 cinematic scenario film 模板，服務像 `ai-2030-three-futures` 這類長片。
- 建立 voice A/B test 腳本，快速比較 Taiwan Mandarin 與 multilingual voices。
- 把 `gpt-image-2-quota-research`、`ai-tool-cost-benchmark`、`ai-2030-three-futures` 的共通腳本抽到 shared templates。

優先級低但值得探索：

- 在 `pi/projects/` 重做同題專案，實測 Pi + Copilot / provider auth 的可重跑能力。
- 研究 Azure Speech 或其他 TTS provider，以解決正式片的精準發音與多語切換。
- 評估 Remotion 或更完整的 video pipeline，用於需要複雜鏡頭語言的專案。

## 9. 何時選擇 Pi workflow

這次 `pi/projects/latest-tts-voice-clone-research` 的經驗顯示，Pi 很適合做「可重跑、工具鏈完整、需要本機文件落地」的製作，但不一定適合所有高品質影片的第一輪創作。

### Pi 更有優勢的情境

- 需要把所有成果落成本機文件、腳本、資料夾結構，方便之後重跑。
- 任務依賴多個本機 CLI：`edge-tts`、`ffprobe`、`ffmpeg`、`hyperframes`、document parser。
- 需要做批次檔案操作、批次檢查、批次生成 TTS / subtitles。
- 需要把踩坑修復固化成 scripts，例如 `audio:audit`、`check-project.js`。
- 需要驗證 Pi packages、auth boundary、workflow reproducibility。
- 任務可以拆成明確步驟，而且每步都有可檢查的本機 artifact。

### Pi 較有劣勢的情境

- 需求仍很模糊，需要大量審美判斷、互動式取捨或即時人類 feedback。
- 高品質短片需要精準節奏、口播壓縮、鏡頭語言和人工導演感；Pi 容易先把流程跑通，但不一定先把節奏做對。
- 外部服務不穩定或 auth 未配置時，Pi 會花時間處理工具阻力。
- 圖像生成、TTS、render 都昂貴時，若沒有 preview gate，Pi 可能過早產生不理想 render。
- 需要非常細緻的語音 QA、情緒控制、逐句重錄時，單靠 Edge-TTS 批次生成不夠。

### 實務選擇建議

- **研究 + 可重跑工程 + 本機產物：** 優先 Pi。
- **快速高品質創意 draft：** 可先用 Codex / codex-pi 統籌，再把穩定流程交給 Pi 重跑。
- **正式影片發布：** Pi 可負責生成與驗證，但必須加入人工 preview gate，尤其是 audio timing、字幕、視覺 readability。
- **長期標準化：** 把 Pi 中踩過的坑轉成 shared scripts / templates，讓下一個專案少走彎路。

## 10. 常用命令

在專案目錄內：

```powershell
npm run tts
npm run check
npm run dev
npm run render
```

量音訊：

```powershell
Get-ChildItem assets\audio -Filter 'slide-*.mp3' | Sort-Object Name | ForEach-Object {
  $d = ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 $_.FullName
  '{0} {1:N3}s' -f $_.Name, [double]$d
}
```

檢查影片：

```powershell
ffprobe -v error -show_entries format=duration,size -show_streams -of json renders\<file>.mp4
```

生成 contact sheet：

```powershell
ffmpeg -y -i renders\<file>.mp4 -vf "fps=1/20,scale=320:-1,tile=5x4" -frames:v 1 renders\contact-sheet.jpg
```

## 11. 下一次開工建議

新專案開始時，先做這幾件事：

1. 選定 workflow folder。
2. 從 `shared/templates/hyperframes-research-project/` 複製模板。
3. 填好 `project.json`。
4. 寫 `data/research.json` 與 `docs/references.md`。
5. 寫 `data/storyboard.json`。
6. 生成或整理圖片到 `assets/images/`。
7. 用 pronunciation map 產生 TTS。
8. 用 `ffprobe` 對齊時間線。
9. 跑 `npm run audio:audit`，確保沒有音頻截斷風險。
10. `npm run check` 到乾淨。
11. 用 `npm run preview` / `npm run dev` 讓人類先瀏覽。
12. Preview 批准後才 `npm run render`。

這套流程的核心不是「一次做完」，而是讓每個專案都能被檢查、重跑、更新來源、替換 voice、替換圖片、重新 render。
