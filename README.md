# Snowy HyperFrames Workflows

這個根目錄用來管理多條 HyperFrames 產製工作流。每條 workflow 都有自己的 `projects/`，每個具體影片或簡報專案都放在對應 workflow 的 `projects/<project-name>/`。

## Workflow Layout

```text
snowy-hyperframes/
├── codex-pi/
│   └── projects/
├── codex/
│   └── projects/
├── pi/
│   └── projects/
└── shared/
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

## Naming Convention

具體專案資料夾使用短橫線命名：

```text
<topic>-<format>-<date-or-purpose>
```

例如：

```text
gpt-image-2-quota-research
```

## Required Project Metadata

每個具體 project 都應該有：

```text
project.json
```

它記錄：

- `workflow`: `codex-pi`、`codex` 或 `pi`
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
```

未來正式製作、客戶專案、未公開素材、私人 voice data 或 provider cache 不應進入 GitHub。`.gitignore` 已採用 project allowlist：新建於 `codex/projects/`、`codex-pi/projects/`、`pi/projects/` 的 project 會預設被忽略，只有經過公開審核後才加入 allowlist。

## Recommended Project Checks

在任一具體 HyperFrames 專案內：

```powershell
npm run check
```

需要音訊長度檢查（若專案提供）：

```powershell
npm run audio:audit
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
