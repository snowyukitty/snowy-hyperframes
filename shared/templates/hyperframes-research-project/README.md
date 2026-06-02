# HyperFrames Research Project Template

複製本模板到：

```text
<workflow>/projects/<project-name>/
```

然後填寫：

```text
project.json
data/research.json
data/storyboard.json
data/image-prompts.json
data/pronunciation-map.json
docs/references.md
docs/storyboard.md
docs/runbook.md
docs/retrospective.md
```

## Minimum Deliverables

- `index.html`
- `package.json`
- `hyperframes.json`
- `meta.json`
- `assets/images/`
- `assets/audio/`
- `captions/narration.srt`
- `data/research.json`
- `data/storyboard.json`
- `data/image-prompts.json`
- `data/pronunciation-map.json`
- `docs/references.md`
- `docs/storyboard.md`
- `docs/runbook.md`
- `project.json`

## TTS Pronunciation

Use `slide-XX.display.txt` for viewer-facing narration and generated `slide-XX.tts.txt` for Edge-TTS input.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-tts.ps1
```

The shared strategy is documented at `shared/docs/tts-pronunciation-strategy.md`.

## Verification

```powershell
npm run check
```
