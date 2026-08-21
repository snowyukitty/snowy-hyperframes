# Snowy HyperFrames Workflows

這個根目錄用來管理多條 HyperFrames 產製工作流。每條 workflow 都有自己的 `projects/`，每個具體影片或簡報專案都放在對應 workflow 的 `projects/<project-name>/`。

> **2026-08-22 — Workflow v2.** 新增共用工具鏈 `shared/tools/hf.mjs`（storyboard → TTS → 量測 → 同步 → 檢查，一條指令可重跑）、
> 第四條 workflow `claude/`、可直接 render 的 template、HyperFrames 0.8.6 升級、CI 與 `AGENTS.md`。
> 設計文件（下一個里程碑的規格與驗收）：`shared/docs/design-v2.md`；接續點：`shared/docs/phase-summary-2026-08-22.md`；升級實測：`shared/docs/hyperframes-0.8-upgrade-notes.md`。
>
> **English summary.** A public, research-grade record of AI-assisted research-to-video production on
> [HyperFrames](https://github.com/heygen-com/hyperframes): four agent workflows (`codex`, `codex-pi`, `pi`, `claude`),
> one shared zero-dependency toolkit (`shared/tools/hf.mjs`) that turns a storyboard into a timed, captioned,
> Edge-TTS-narrated Traditional-Chinese video, shared schemas/templates, and reviewed demo projects. Agent contract: `AGENTS.md`.

## Workflow Layout

```text
snowy-hyperframes/
├── codex-pi/
│   └── projects/
├── codex/
│   └── projects/
├── pi/
│   └── projects/
├── claude/
│   └── projects/
└── shared/
    ├── tools/        hf.mjs — 共用工具鏈
    ├── vendor/       gsap.min.js — render 不依賴 CDN
    ├── docs/
    ├── schemas/
    └── templates/
```

## Workflows

### `codex-pi`

Codex 負責統籌任務、查資料、整理結構、必要時調用 Pi 或本機 CLI；圖片素材優先使用 Codex 會話內建 image generation。適合目前這種「Pi 工具鏈已配置，但 Pi 尚未登入 `openai-codex`」的情境。

目前專案：

```text
codex-pi/projects/gpt-image-2-quota-research
```

### `codex`

只用 Codex 完成 HyperFrames 專案。適合不需要 Pi packages、Pi auth、或 Pi session 可重跑性的工作。

目前專案：

```text
codex/projects/ai-tool-cost-benchmark
codex/projects/ai-2030-three-futures
```

### `pi`

用 Pi 完成 HyperFrames 專案，並讓 Pi 透過 `openai-codex` login 調用 `codex_generate_image`。適合讓 Pi 自主重跑研究、生成圖片、產生 TTS、驗證 HyperFrames、保存完整本機 artifacts 的工作流。

Pi 的強項是工程化與可重跑：批次檔案、CLI、自動檢查、文檔沉澱。Pi 的弱項是如果沒有人工 preview gate，容易過早 render 出節奏或音訊有問題的版本。正式影片必須先 `npm run check`、`npm run audio:audit`、`npm run preview`，人工確認後再 render。

目前專案：

```text
pi/projects/latest-tts-voice-clone-research
```

完成狀態：11-slide TTS / AI voice cloning research video，已生成 no-cut render；詳見 `pi/projects/latest-tts-voice-clone-research/docs/completion-summary.md`。

### `claude`

由 Claude Code 主導，並且一律透過 `shared/tools/hf.mjs` 走標準管線（`new → html → pipeline → check → preview → render`）。
專案結構與其他三條 workflow 完全相同，任何一條 workflow 都能接手。詳見 `claude/README.md`。

目前專案：

```text
claude/projects/storyboard-to-video-pipeline-demo
```

完成狀態：6 頁、77 秒、零 bitmap、Edge-TTS 旁白的自我描述 demo，`hyperframes@0.8.6 check` 0 error，已 smoke render；人工 preview 待做（`ready-to-preview`）。

## Naming Convention

具體專案資料夾使用短橫線命名：

```text
<topic>-<format>-<date-or-purpose>
```

例如：

```text
gpt-image-2-quota-research
```

## Shared Toolkit

```powershell
node shared/tools/hf.mjs help
node shared/tools/hf.mjs new <workflow>/<project-name>   # 建專案
node shared/tools/hf.mjs audit --all                      # 所有專案的結構 / schema / 時間 / 音訊截斷檢查（CI 同款）
node shared/tools/hf.mjs repo-check                       # 發布守門（allowlist / secret / 檔案大小）
```

專案內：`npm run html` → `npm run pipeline` → `npm run check` → `npm run preview`（人工）→ `npm run render`。
原則：**一份 storyboard、一個時間真相**——`data/storyboard.json` + `data/audio-durations.json` → `data/timeline.json` → 其他檔案都是產物。

## Required Project Metadata

每個具體 project 都應該有：

```text
project.json
```

它記錄：

- `workflow`: `codex-pi`、`codex`、`pi` 或 `claude`
- `status`: draft、ready-to-preview、ready-to-render、rendered、archived
- `tools`: 用到的工具
- `auth.required`: 專案需要哪些 auth，但不存 token
- `imageGeneration`: 圖片由誰生成
- `paths`: entry、research、storyboard、references、render output

Schema 在：

```text
shared/schemas/project.schema.json
```

## Shared Assets

共用模板與 schema 放在：

```text
shared/
```

目前包含：

```text
shared/tools/hf.mjs
shared/vendor/gsap.min.js
shared/templates/hyperframes-research-project/
shared/schemas/project.schema.json
shared/schemas/research.schema.json
shared/schemas/storyboard.schema.json
shared/schemas/pronunciation-map.schema.json
shared/docs/workflow-boundaries.md
shared/docs/tts-pronunciation-strategy.md
shared/docs/hyperframes-production-playbook.md
```

新研究型 HyperFrames 專案建議先複製模板，再放入某條 workflow 的 `projects/<project-name>/`。

## Production Playbook

目前累積的 HyperFrames 製作經驗、踩坑記錄、TTS/字幕/圖片/timeline/render 標準流程，整理在：

```text
shared/docs/hyperframes-production-playbook.md
```

No-API-key / local-first TTS 升級路線在：

```text
shared/docs/local-tts-no-api-key-strategy.md
```

目前階段性收尾與下次 wake up 接續點：

```text
shared/docs/phase-summary-2026-08-22.md
```

HyperFrames 0.6 → 0.8 升級實測與注意事項：

```text
shared/docs/hyperframes-0.8-upgrade-notes.md
```

三條 workflow 的實測比較在：

```text
shared/docs/workflow-test-summary.md
```

GitHub 公開邊界與未來 project 提交規則在：

```text
shared/docs/repo-publication-policy.md
```

## Public Demo Policy

目前測試 project 可作為 demo / reference 上傳到 GitHub，包含圖片、MP3、字幕、HTML、metadata 與 MP4：

```text
codex/projects/ai-tool-cost-benchmark
codex/projects/ai-2030-three-futures
codex-pi/projects/gpt-image-2-quota-research
pi/projects/latest-tts-voice-clone-research
claude/projects/storyboard-to-video-pipeline-demo
```

新的 render（MP4）不再進 git；四支 2026-06 的 demo MP4 保留在歷史中，之後的成片放 GitHub Releases。

未來正式製作、客戶專案、未公開素材、私人 voice data 或 provider cache 不應進入 GitHub。`.gitignore` 已採用 project allowlist：新建於 `codex/projects/`、`codex-pi/projects/`、`pi/projects/`、`claude/projects/` 的 project 會預設被忽略，只有經過公開審核後才加入 allowlist。

## Recommended Project Checks

在任一具體 HyperFrames 專案內（`check` = `hf audit` + `npx hyperframes@0.8.6 check`，含音訊截斷風險檢查）：

```powershell
npm run check
```

只跑本機、不開瀏覽器的結構 / schema / 音訊檢查：

```powershell
npm run audit
```

需要預覽，render 前應先讓人類看瀏覽器版本：

```powershell
npm run preview
# 或
npm run dev
```

需要渲染：

```powershell
npm run render
```
