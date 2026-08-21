# Phase Summary — 2026-08-22

上一個 stop point：`phase-summary-2026-06-03.md`。本文件記錄這個 session 做了什麼、驗證了什麼、
下一次 wake up 從哪裡接。

## 1. 出發點（review 發現）

| 發現 | 嚴重度 | 處置 |
| --- | --- | --- |
| 本機 `snowy-hyperframes/` 目錄是**空的**；Atlas health 也標記「public repo 沒有本機 checkout」。 | 高 | 重新 clone（172 MB；一般 clone 在 75% 斷線，改用 blobless + sparse，暫不拉四支 demo MP4）。 |
| 06-03 記錄的私有 `codex/projects/tts-local-bakeoff`（8 段 golden samples、Edge-TTS baseline、scorecard）**不在這台機器上**。 | 中 | 未找到；若在另一台機器請手動帶回。 |
| 四個 demo pin `hyperframes@0.6.64`；上游已到 0.8.6，`validate/inspect` 已 deprecated。 | 中 | 全部升級到 0.8.6 + `check`，實測通過（見 upgrade notes）。 |
| `shared/` 只有 docs / schemas / templates，**沒有可執行工具**；每個專案各帶一套 PowerShell / Node 檢查腳本，寫死 slide 數，六份時間軸手動同步。 | 高 | 新增 `shared/tools/hf.mjs`（零依賴）。 |
| Snowy 自訂 `hyperframes.json` 與上游 `hyperframes.json`（registry/paths，`additionalProperties:false`）**同名衝突**。 | 中 | Snowy manifest 改為 `data/timeline.json`；`pi` 舊檔移至 `data/manifest.json`；template 內建上游格式。 |
| `index.html` 從 CDN 載 GSAP；這台機器抓 CDN 7.7s，`check` 直接 navigation timeout。 | 中 | `shared/vendor/gsap.min.js` + `hf vendor`；四個 demo 與 template 都改本機載入。 |
| `pi` demo 的 storyboard / pronunciation-map 從未符合 shared schema；storyboard 指向不存在的圖片檔名。 | 低 | 補上 canonical 欄位與 schema 形狀（保留歷史欄位）。 |
| repo 根目錄沒有 AGENTS.md / CLAUDE.md（Atlas health warning），沒有 CI。 | 中 | 新增 AGENTS.md、CLAUDE.md、`.github/workflows/validate.yml`。 |
| 三條 workflow 以工具命名（codex / codex-pi / pi），沒有 Claude Code 的位置。 | 低 | 新增 `claude/` workflow（schema enum、.gitignore 守門、README）。 |
| 170 MB repo，其中 127 MB 是四支 MP4。 | 低 | 政策：新 render 不進 git（`**/renders/*.mp4` 忽略，四支舊檔保留），改放 GitHub Releases。 |

## 2. 做了什麼

### `shared/tools/hf.mjs` — 共用工具鏈（零依賴 Node ≥ 22）

```text
new <workflow>/<name>  從 template 建專案（填 id、vendor GSAP、上游 hyperframes.json）
html                   storyboard -> index.html 的 slide/audio 區塊（標記之間；CSS/JS 保留）
prepare-tts            narration -> slide-NN.display.txt -> pronunciation map -> slide-NN.tts.txt
tts                    Edge-TTS（voice/rate/pitch 來自 storyboard.voice；新檔才重做）
measure                ffprobe -> data/audio-durations.json
sync                   -> data/timeline.json、index.html 時間屬性、narration.srt、project.json（policy audio|storyboard）
fit-audio              舊專案：保留 slide 視窗、audio slot = MP3 實長、root data-duration 對齊
vendor                 GSAP 本機化
audit [--all] [--json] 結構 / schema / 資產 / 時間 / cut-risk / clip-media-fit / 舊 CLI 用法 / hyperframes.json 衝突
repo-check             發布守門：allowlist、secret 路徑、>95 MB、tracked 專案必備檔
pipeline               prepare-tts -> tts -> measure -> sync -> audit
```

設計原則：**一份 storyboard、一個時間真相**。storyboard（意圖）+ audio-durations（量測）→ timeline（結果）→
所有其他檔案都是產物。舊 demo 的 `["#slide-NN", start]` GSAP 陣列也會被 `sync` 一併更新；
新 template 的 GSAP 直接讀 DOM `data-start`，沒有第二份會漂移的時間陣列。

### Template 升級為「可直接 render 的專案」

`index.html`（CJK `@font-face(local)`、full-bleed、lower-third、eyebrow、進度標籤、無圖片時的漸層 + SVG 進度環、
DOM 驅動 GSAP）、`package.json`（全部指向 hf + hyperframes@0.8.6）、上游格式 `hyperframes.json`、`docs/references.md`。

### 四個 2026-06 demo 現代化（不重新 time）

`package.json` → 0.8.6 / `check` / hf；`hf vendor`；`hf fit-audio`；`pi` 資料補齊與 manifest 搬移。
**實測：四個 demo `hyperframes@0.8.6 check` 全部 0 error / 0 warning。**

### 新 demo：`claude/projects/storyboard-to-video-pipeline-demo`

6 頁、77.2 s、零 bitmap、Edge-TTS；`hf new → html → pipeline → check → render` 端到端通過
（check：lint 0/0、runtime 0/0、layout 0、motion 0、contrast 18/18；render 33.8 s）。人工 preview **未做**，
status 停在 `ready-to-preview`。已 allowlist 公開（內容自述、無外部主張、無 bitmap、無 secret）。

### 文件與治理

AGENTS.md、CLAUDE.md、`claude/README.md`、`hyperframes-0.8-upgrade-notes.md`、本文件、CI workflow、
`.gitignore`（claude 守門、renders 政策）、`project.schema.json`（`claude` workflow、`not-applicable` confidence）。

## 3. 驗證紀錄

| 檢查 | 結果 |
| --- | --- |
| `node shared/tools/hf.mjs audit --all` | 5 專案、0 error（codex-pi 有 3 個 duplicate-image warning，是 2026-06 已知設計） |
| `node shared/tools/hf.mjs repo-check` | 0 problem |
| `npx hyperframes@0.8.6 check` × 5 專案 | 全部 Check passed |
| `npx hyperframes@0.8.6 render` demo | 77.2 s MP4，contact sheet 目視正常 |
| 人工 preview | 未做（agent session） |

## 4. 下一個里程碑：「研究型 zh-Hant 解說影片，一條指令可重跑」

建議順序（每一步都有可驗收產物）：

1. **人工 gate**：在瀏覽器 preview `storyboard-to-video-pipeline-demo`，聽旁白、看節奏；OK 就把 status 改 `rendered`，
   MP4 放 GitHub Release（不是 git）。
2. **TTS bakeoff 回來**（06-03 的未完成項）：用上游 `npx hyperframes tts`（本機 Kokoro，`zf_xiaobei` 等中文聲音）
   對同一組 8 段 golden samples 產生音檔，與 Edge-TTS 用同一份 scorecard 對比；結果寫進
   `shared/docs/local-tts-no-api-key-strategy.md`。若 `tts-local-bakeoff` 在別台機器，先帶回來。
3. **Template 內容區塊**：在 `hf html` 支援 storyboard 的 `blocks`（`metrics` / `cards` / `list` / `quote`），
   並接上游 registry 的 `data-chart` / `flowchart`，讓無 bitmap 的研究影片也有資訊密度。
4. **字幕升級**：`hf captions --word-level`，用 `npx hyperframes transcribe` 或 Edge-TTS `--write-subtitles`
   做詞級時間戳（對應 `pi` 研究裡的 WhisperX 結論）。
5. **BGM bed + voiceover carve**：用 `/media-use` + `/hyperframes-audio`，給研究影片一條安靜的音樂床。
6. **第一支真正的研究影片走新管線**：題目建議「2026 no-API-key TTS ladder 實測」——正好把 bakeoff 的結果
   變成影片，研究分層（官方 / 社群 / 估算）照 playbook。
7. **英文 README 段落**：Atlas registry 標記 canonical language `en`，但 README 全中文；加一段英文總覽。
8. **Atlas**：回到 `snowy-repo-atlas` 更新 registry（checkout present、4 條 workflow、port 3002 仍為 preview；
   可考慮 `hyperframes preview` 的預設 port），這是另一個 repo，需要另開 scope。

## 5. Stop point

乾淨。工具鏈、template、四個 demo、新 demo、CI、文件都已驗證；唯一未做的是人工 preview。
