# Retrospective

## Tools Used

| Tool | Purpose |
| --- | --- |
| Codex | 研究、情境設計、專案實作、檔案管理、驗證。 |
| Web research | 查 2030 相關官方與可信來源。 |
| Codex image generation | 生成 14 張原始情境圖片，另複製為 15 張每頁專用圖片。 |
| Edge-TTS | 產生繁體中文旁白 MP3。 |
| HyperFrames CLI | preview、lint、validate、inspect、render。 |
| FFmpeg / FFprobe | 檢查音訊長度並更新 timeline。 |

## Design Choices

- 三個版本放在同一支影片裡，形成完整情緒曲線：證據 -> 樂觀 -> 一般 -> 悲觀 -> 選擇。
- 圖片不烤文字，數字與結論都用 HTML overlay，便於之後更新來源。
- 樂觀不是烏托邦，悲觀不是災難娛樂；三個版本都要合理、可想像、可用於策略討論。
- 使用每頁專用圖片檔名，避免 HyperFrames duplicate media discovery warning。

## Follow-Up

- 抽出 `optimistic`、`baseline`、`pessimistic` 三個獨立 render 版本。
- 增加一份 `data/decision-levers.json`，把每個情境對應到 2026-2030 的可行政策/組織行動。
- 做英文版旁白與雙語字幕。
- 若使用 Remotion 或完整影片管線，可加入更細緻的鏡頭推拉、粒子與分鏡轉場。

## Verification

```text
npm run check
```

Result:

```text
0 lint errors, 0 lint warnings, 0 layout issues.
Chrome AudioContext validation warning only.
```

Rendered output:

```text
renders/ai-2030-three-futures.mp4
duration: 308.054s
video: 1920x1080, 30 fps, H.264
audio: AAC stereo, 48 kHz
size: 44,649,770 bytes
```

## 2026-08-24 maintenance

- Upgraded the active CLI pin to HyperFrames 0.8.11 and routed `npm run check` through the hidden-window shared wrapper.
- Verification: `hf audit` 0 errors / 0 warnings; `hyperframes check --strict` passed with lint, runtime, layout, and motion at 0 findings and 40/40 contrast checks passing.
- The historical render was not repeated and remains outside this sparse working tree.
