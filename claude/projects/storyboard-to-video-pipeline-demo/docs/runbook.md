# Runbook — storyboard-to-video-pipeline-demo

目標：證明 `shared/tools/hf.mjs` 可以把一份 storyboard 端到端帶到 MP4，且每一步可重跑。

## 0. 環境

- Node ≥ 22、FFmpeg/ffprobe、`pip install --user edge-tts`。
- `npm run doctor` should report FFmpeg, FFprobe, and the browser runtime ready. Every script
  resolves the explicit `hyperframesVersion` pin from `package.json` (currently `0.8.16`).

## 1. Storyboard（意圖）

編輯 `data/storyboard.json`：每頁 `id`、`title`、`chapter`、`durationTarget`、`image`（可留空）、
`subtitle`（字幕）、`narration`（旁白 = display text）。`voice` 區塊決定 Edge-TTS 的 voice / rate / pitch。

## 2. 產生 HTML

```powershell
npm run html            # 第一次；之後只重寫 hf:* 區塊，CSS/JS 保留
npm run html -- --force # 要整份從 template 重建時（會覆蓋 index.html）
```

## 3. TTS → 量測 → 同步 → 檢查

```powershell
npm run pipeline
# = prepare-tts (narration -> display.txt -> pronunciation map -> tts.txt)
#   tts        (Edge-TTS -> slide-NN.mp3；已是最新的會跳過，--force 重做)
#   measure    (ffprobe -> data/audio-durations.json)
#   sync       (policy=audio, pad=0.6s -> data/timeline.json, index.html, narration.srt, project.json)
#   audit      (結構 / schema / 時間 / cut-risk)
```

想鎖定 storyboard 的秒數而不是跟著音訊走：`npm run sync -- --policy storyboard`（MP3 超長會直接失敗）。

## 4. Gate

```powershell
npm run check -- --strict  # hf audit + pinned HyperFrames browser gate: zero findings
npm run review             # human: pacing, pronunciation, and readability
```

## 5. Render

```powershell
npm run render     # renders/storyboard-to-video-pipeline-demo.mp4
ffprobe -v error -show_entries format=duration,size -of compact renders/storyboard-to-video-pipeline-demo.mp4
ffmpeg -y -i renders/storyboard-to-video-pipeline-demo.mp4 -vf "fps=1/13,scale=640:-1,tile=3x2" -frames:v 1 renders/contact-sheet.jpg
```

## 6. English deliverable

The English edition is not a second project. Its commands resolve the localized fields in the same
storyboard and write only namespaced outputs:

```powershell
npm run html:en
npm run pipeline:en
npm run check -- --strict --all-locales
npm run review:en
# npm run render:en only after the English human review passes
```

Canonical approval does not approve English. Record verdicts independently under
`project.json.deliverables.<locale>.review`.

## 2026-08-22 實測

| 步驟 | 結果 |
| --- | --- |
| `hf pipeline` | 6 MP3（68.57s 旁白），timeline 77.2s，audit 0 error |
| `hyperframes@0.8.6 check` | lint 0/0、runtime 0/0、layout 0 issues / 9 samples、motion 0/0、contrast 18/18 WCAG AA |
| `hyperframes@0.8.6 render` | 77.2s、1920×1080 30fps H.264 + AAC 48k、6.9 MB、33.8s 完成（RTX 4090、3 workers） |
| 人工 preview | **未做**（agent session）；status 停在 `ready-to-preview` |
