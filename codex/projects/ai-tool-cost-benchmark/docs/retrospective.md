# Retrospective

## Tools Used

| Tool | Purpose |
| --- | --- |
| Codex | 研究、設計成本模型、建立 HyperFrames 專案、生成圖片與驗證。 |
| Web research | 查官方價格、billing、AI credits、Claude Code 用量與 API 計價。 |
| Codex image generation | 產生無文字背景圖，避免數字烤進圖片。 |
| Edge-TTS | 生成繁中旁白 MP3。 |
| HyperFrames CLI | preview、lint、validate、inspect、render。 |
| FFprobe | 檢查每頁音訊長度，對齊時間軸。 |

## Lessons

- 比較工具成本時，不能只看月費；要把 research、agent work、image、TTS、subtitle、render、QA 分層。
- Pi 應被視為 provider router 和 CLI harness；真正成本來自它背後的 Copilot/OpenAI/Anthropic/search provider。
- Claude Code 的價值在長上下文與程式碼推理；對 research-to-video，媒體管線仍需外掛。
- Codex workflow 在 Snowy 目前最像端到端工作台，尤其當圖片生成、TTS、文件編輯和 HyperFrames 檢查都可在同一輪完成。
- 每個專案都要保存 `cost-model.json`，否則未來很難比較 workflow 的可重跑成本。

## Follow-Up

- 增加 `scripts/measure-cost.ps1`，把來源數、圖片數、音訊長度、render 次數輸出成 project cost ledger。
- 將 SRT timing 由 `ffprobe` 自動生成。
- 建立 `shared/templates/hyperframes-cost-benchmark-project/`，把本專案的資料模型抽出。
- 在 `pi/projects/` 製作同題實驗，實測 Copilot AI credits 或 provider usage。
- 在 `codex-pi/projects/` 製作混合實驗，測試 Codex 產圖 + Pi 查資料/封裝的成本。

## Verification

```text
npm run check
```

Result:

```text
0 lint errors, 0 lint warnings, 0 layout issues.
Chrome AudioContext validation warning only.
```

## 2026-08-24 maintenance

- Upgraded the project pin from the 0.8.6 maintenance baseline to HyperFrames 0.8.11; `npm run check` now uses the hidden-window shared wrapper.
- The newer layout audit found the final slide's source note behind its expanded caption. Moving the note from `bottom: 184px` to `232px` gives it a separate readable zone.
- Verification: an explicit check at 190.02 s reports 0 layout issues; the full strict gate passes with 76/76 contrast checks.
- The project was not rendered and no human approval state changed.
