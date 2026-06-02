# GPT-Image-2 Quota Research HyperFrames Project

繁體中文調研型 HyperFrames 簡報，主題是 ChatGPT Free、Plus、Pro 使用 GPT-Image-2 / ChatGPT Images 2.0 時的每日圖片生成量估算。

## Current Status

- Final render: not rendered.
- Composition duration: 122 seconds.
- Voiceover: generated with Edge-TTS, one audio file per slide.
- Images: generated bitmap assets are copied into `assets/images/`.
- Key quota numbers: official figures are separated from community reports and estimates.

## Directory Structure

```text
.
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── assets/
│   ├── audio/
│   │   ├── narration.txt
│   │   ├── slide-01.mp3
│   │   ├── slide-01.txt
│   │   └── ... slide-07.*
│   └── images/
│       ├── evidence-layers.png
│       ├── quota-dashboard.png
│       └── safe-range-gauges.png
├── captions/
│   └── narration.srt
├── data/
│   ├── image-prompts.json
│   ├── research.json
│   └── storyboard.json
├── docs/
│   ├── edge-tts.md
│   ├── references.md
│   ├── runbook.md
│   └── storyboard.md
├── hyperframes.json
├── index.html
├── meta.json
├── package.json
├── renders/
└── scripts/
    └── generate-tts.ps1
```

## Common Commands

```powershell
npm run tts
npm run check
npm run render
```

`npm run render` writes:

```text
renders/gpt-image-2-quota-research.mp4
```

The current task explicitly requested no final render, so only `npm run check` should be used for verification.
