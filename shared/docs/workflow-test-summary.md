# Workflow Test Summary

更新日期：2026-06-02

本文件匯總 `codex`、`codex-pi`、`pi` 三條 Snowy HyperFrames workflow 的實測結果。單一專案的細節仍以各 project 的 `docs/retrospective.md`、`docs/runbook.md` 和 `project.json` 為準。

## 1. 測試專案

| Workflow | Demo project | Status | Public demo artifact |
| --- | --- | --- | --- |
| `codex` | `codex/projects/ai-tool-cost-benchmark` | rendered | `renders/ai-tool-cost-benchmark.mp4` |
| `codex` | `codex/projects/ai-2030-three-futures` | rendered | `renders/ai-2030-three-futures.mp4` |
| `codex-pi` | `codex-pi/projects/gpt-image-2-quota-research` | ready-to-render / project package complete | project assets, TTS, captions, HyperFrames files |
| `pi` | `pi/projects/latest-tts-voice-clone-research` | rendered no-cut draft | `renders/latest-tts-voice-clone-research-nocut.mp4` |

這些專案是目前的公開 demo / reference set。它們可以連同圖片、MP3、字幕、HTML、metadata 與 MP4 一起提交到 GitHub，用來展示完整工作流與踩坑修復。

## 2. `codex` Workflow

定位：Codex 直接完成 research、素材、HTML、TTS、檢查與 render。

實測結果：

- 端到端整合效率最高，適合快速把研究題目做成可播放影片。
- 對本機檔案、HyperFrames、Edge-TTS、FFmpeg 的串接穩定。
- 較適合高審美、高整合度、需要快速判斷與修正的第一版製作。
- 若不要求 Pi 之後自主重跑，這是目前最順的 production path。

主要教訓：

- research-to-video 成本不能只看月費，要拆成模型推理、web search、生圖、TTS、字幕、render、QA。
- 圖像不要烤入關鍵文字與數字，應使用 HTML overlay。
- 每頁音訊生成後要用 `ffprobe` 校準 timeline。

## 3. `codex-pi` Workflow

定位：Codex 統籌產出 Pi-compatible project，保留 prompts、資料與腳本，讓 Pi 未來可以接手或重跑。

實測結果：

- 適合過渡期：Pi toolchain 已配置，但 auth、provider、成本或穩定性還沒完全就緒。
- 可以先由 Codex 完成研究與素材，專案仍按照 Pi 可接手的結構保存。
- 對「需要留下 prompts、metadata、runbook、retrospective」的教育型專案很適合。

主要教訓：

- Pi 要自行調用 `codex_generate_image` 必須有 `openai-codex` auth；GitHub Copilot auth 不能替代。
- 未公開的 quota 或 pricing 不能寫成官方限制，必須分成官方、社群回報、估算。
- 保留 Pi-compatible 結構比當場實際調 Pi 更重要，因為它讓後續重跑有清楚邊界。

## 4. `pi` Workflow

定位：Pi 自主執行研究影片工程化流程，重點是可重跑、本機 artifacts、CLI 串接與檢查腳本。

實測結果：

- Pi 很適合把 project 落成完整本機系統：scripts、checks、metadata、assets、TTS、captions、render。
- Pi 可完成 11-slide TTS / AI voice clone 研究影片，包含圖片、MP3、字幕、audio audit 與 no-cut render。
- Pi 的風險在於沒有人工 preview gate 時會太快 render，品質問題可能到成片才暴露。
- 長 session 容易遇到 request body too large / context overflow，尤其是圖片輸出、長 logs、長 JSON 進入上下文後。

主要教訓：

- 不要 resume 已經塞滿圖片/log 的舊 session；新任務用新 session，靠本機文件續作。
- 模型要按任務分級：低成本模型做搬檔/補 JSON，高成本模型只做短判斷。
- `npm run check` 必須包含 `audio:audit`，避免 MP3 比 slide duration 長而被強制截斷。
- `npm run dev` / `npm run preview` 必須是真正的 HyperFrames Studio preview，不應只是 raw static server。

## 5. 統一結論

目前建議工作模式：

1. 模糊需求、研究判斷、第一版創意整合：優先 `codex`。
2. 想保留 Pi 接手能力，但仍要由 Codex 快速統籌：用 `codex-pi`。
3. 需要可重跑工程、批次 CLI、metadata、audio audit、render automation：用 `pi`。

正式影片發布前的共通 gate：

```powershell
npm run audio:audit  # 若有 MP3/TTS
npm run check
npm run preview      # 或 npm run dev
```

人工確認旁白、字幕、圖文可讀性和節奏後，才執行：

```powershell
npm run render
```

## 6. 下一步標準化

- 把 audio-driven timeline 生成做成 shared script。
- 把 cost ledger schema 放進 `shared/schemas/`。
- 為 voice A/B test 建立共用腳本。
- 把 public demo 與 private production project 的 GitHub 邊界固定到 `.gitignore` 和 publication policy。
