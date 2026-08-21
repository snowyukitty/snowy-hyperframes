# Claude Workflow

`claude` 用於由 Claude Code 主導完成的 HyperFrames 專案。

```text
claude/
└── projects/
```

定位：

- Claude Code 統籌研究、分鏡、HTML、TTS、檢查與 render，並且**一律透過 `shared/tools/hf.mjs`** 走
  標準管線（`new → html → pipeline → check → preview → render`），不在專案內重寫 check / TTS 腳本。
- 專案結構與 `codex` / `codex-pi` / `pi` 完全相同（同一份 template、同一組 schema），所以任何一條
  workflow 都可以接手 `claude/projects/` 裡的專案。
- 圖片可以是 Codex / Pi 生成的 bitmap，也可以完全不用 bitmap（template 內建漸層背景 + 純排版），
  後者適合「不需要圖片 auth、只想快速驗證流程」的 demo。

適用情境：

- 需要同時改動 `shared/` 工具鏈與具體專案（例如：新增一個 toolkit 能力，並用一個 demo 證明它）。
- 研究型影片第一版：研究分層（官方 / 社群 / 估算）、storyboard、pronunciation map、audio-driven timeline。
- 既有專案的升級、審核與修復（HyperFrames 版本升級、audit、publication review）。

Render gate 與其他 workflow 一致：

1. `npm run check`（`hf audit` + `hyperframes check`，0 error）
2. `npm run preview`，人工確認節奏、發音、圖文可讀性
3. 才 `npm run render`

## Projects

```text
projects/storyboard-to-video-pipeline-demo
```

`storyboard-to-video-pipeline-demo`：六頁、約 80 秒、純 HTML 視覺（無 bitmap）、Edge-TTS 旁白的
自我描述 demo，用來證明 `shared/tools/hf.mjs` 的 storyboard → TTS → measure → sync → audit →
check → render 管線可以端到端重跑。
