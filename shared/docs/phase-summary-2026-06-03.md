# Phase Summary — 2026-06-03

本文件是 Snowy HyperFrames 目前階段的收尾記錄，方便下次 wake up 後直接接續工作。

## 1. Repository Status

GitHub repo：

```text
https://github.com/snowyukitty/snowy-hyperframes
```

Branch：

```text
main -> origin/main
```

目前 public repo 只承載：

- 已審核 demo / reference projects。
- workflow 文檔。
- shared templates / schemas。
- TTS / HyperFrames 製作經驗與策略。

未來新 project 預設不進 GitHub；`.gitignore` 已用 allowlist 保護 `codex/projects/`、`codex-pi/projects/`、`pi/projects/`。

## 2. Completed Public Work

### Workflow foundation

三條 workflow 已建立並測試：

- `codex`: 高品質 first draft / end-to-end production path。
- `codex-pi`: Codex 統籌、Pi-compatible output。
- `pi`: 可重跑、本機工程化、CLI automation。

主要文檔：

```text
shared/docs/workflow-test-summary.md
shared/docs/workflow-boundaries.md
shared/docs/hyperframes-production-playbook.md
```

### Public demo projects

目前公開 demo / reference projects：

```text
codex/projects/ai-tool-cost-benchmark
codex/projects/ai-2030-three-futures
codex-pi/projects/gpt-image-2-quota-research
pi/projects/latest-tts-voice-clone-research
```

這些 demo 包含可公開的 assets、MP3、captions、HTML、metadata 和 MP4 render。

### TTS strategy

已完成：

```text
shared/docs/tts-pronunciation-strategy.md
shared/docs/local-tts-no-api-key-strategy.md
```

核心方向：

- Edge-TTS 保留為 practical baseline。
- 不把 Edge-TTS 當成藝術品質的終點。
- 建立 no-API-key / local-first TTS bakeoff。
- 先測 Kokoro / MeloTTS，再研究 OpenVoice / CosyVoice。
- F5-TTS、Fish Speech、ChatTTS、Piper 先作研究或參考，不直接 production。

## 3. Private Local Work Completed

已建立本機私有實驗 project：

```text
codex/projects/tts-local-bakeoff
```

此 project 被 `.gitignore` 忽略，沒有上傳 GitHub。

已完成：

- 8 段 golden samples。
- Edge-TTS baseline script。
- 8 段 Edge-TTS MP3。
- duration report。
- listening scorecard template。

Baseline command：

```powershell
cd codex/projects/tts-local-bakeoff
npm run baseline
npm run check
```

Edge-TTS baseline duration：

| Sample | Target | Actual |
| --- | ---: | ---: |
| sample-01 Pure Mandarin Research Narration | 15s | 14.040s |
| sample-02 Mixed English Product Names | 16s | 14.352s |
| sample-03 Numbers, Dates, Prices | 16s | 14.304s |
| sample-04 Long Sentence Segmentation | 16s | 14.640s |
| sample-05 Soft Explainer Tone | 15s | 13.272s |
| sample-06 Emphasis and Contrast | 14s | 12.528s |
| sample-07 Model and License Terms | 18s | 16.872s |
| sample-08 Long-Form Stability | 55s | 51.384s |

Local listening target：

```text
codex/projects/tts-local-bakeoff/assets/audio/edge-tts/sample-01.mp3
...
codex/projects/tts-local-bakeoff/assets/audio/edge-tts/sample-08.mp3
```

Scorecard：

```text
codex/projects/tts-local-bakeoff/docs/listening-scorecard.md
```

## 4. Key Lessons

1. High-quality HyperFrames work should start with `codex`, then move repeatable pieces into `shared/` or `pi`.
2. Pi is strong for automation, but preview and audio QA must stay explicit.
3. Edge-TTS is good enough for baseline, demos, and fast iteration, but not enough as the final TTS quality strategy.
4. TTS quality must be measured with fixed golden samples, not judged from a single generated clip.
5. Audio timing is production-critical: always measure MP3 with `ffprobe` and run `audio:audit`.
6. Future private projects should stay local unless explicitly reviewed and added to `.gitignore` allowlist.

## 5. Next Wake-Up Tasks

Recommended next steps, in order:

1. Listen to the 8 Edge-TTS baseline samples.
2. Fill `codex/projects/tts-local-bakeoff/docs/listening-scorecard.md`.
3. Add Kokoro adapter to the private bakeoff.
4. Generate Kokoro audio for the same 8 golden samples.
5. Add MeloTTS adapter if Kokoro setup succeeds or if Kokoro Chinese quality is weak.
6. Compare Edge-TTS / Kokoro / MeloTTS using the same scorecard.
7. Promote reusable scripts or schema back into `shared/` only after the local bakeoff proves useful.

Deferred work:

- OpenVoice consent-based voice conversion test.
- CosyVoice heavier local setup.
- Shared provider adapter interface.
- TTS quality report schema.
- Automatic audio normalization / loudness QA.

## 6. Current Stop Point

This is a clean stopping point.

Public repo has the stable workflow and strategy documentation. Private local bakeoff has the first Edge-TTS baseline. No further model installation or provider experiments should be started until the baseline samples are listened to and scored.

