# storyboard-to-video-pipeline-demo

A self-describing Snowy HyperFrames Workflow v2 demo and the first Milestone K fixture:
one canonical storyboard produces two independently timed and reviewable language deliverables.

| Locale | Voice | Duration | Entry | Review |
| --- | --- | ---: | --- | --- |
| `zh-Hant` | `zh-TW-HsiaoChenNeural` | 77.2s | `index.html` | pending |
| `en` | `en-US-JennyNeural` | 77.0s | `index.en.html` | pending |

The composition uses no bitmap source art. Its gradient field and progress ring are deterministic
CSS/SVG, so the project rebuilds without image-generation credentials. Every timing surface comes from
`data/storyboard.json` plus measured MP3 durations; generated regions between `<!-- hf:* -->` markers
must not be edited by hand.

## Rebuild the canonical deliverable

```powershell
npm run html
npm run pipeline
npm run check -- --strict
npm run review
# npm run render only after the zh-Hant human verdict passes
```

## Rebuild the English deliverable

```powershell
npm run html:en
npm run pipeline:en
npm run check -- --strict --all-locales
npm run review:en
# npm run render:en only after the English human verdict passes
```

Each variant owns its voice, pronunciation map, audio and word-boundary files, measured duration,
timeline, slide- and word-level captions, HTML entry, render output, and review verdict. Missing variant
narration or subtitle text is an error; no command silently machine-translates it. Passing one review
never passes the other.

## Artifact map

```text
data/storyboard.json             canonical intent + explicit localized fields
data/pronunciation-map.json      canonical display-to-spoken substitutions
data/pronunciation-map.en.json   English display-to-spoken substitutions
data/audio-durations*.json       ffprobe measurements per deliverable
data/timeline*.json              generated timing truth per deliverable
assets/audio/slide-NN.*          canonical display, TTS, MP3, and word boundaries
assets/audio/en/slide-NN.*       English display, TTS, MP3, and word boundaries
captions/narration*.srt          slide- and word-level captions per deliverable
index.html / index.en.html       generated entry regions over shared hand-authored CSS/JS
review/ / review/en/             ignored, self-contained human gate kits
project.json.deliverables        generated per-locale delivery receipts
vendor/gsap.min.js               vendored runtime; render does not depend on a CDN
```

New MP4s are ignored by Git and belong in GitHub Releases when a human-approved master needs sharing.
See `docs/runbook.md` and `docs/retrospective.md` for the operating history.
