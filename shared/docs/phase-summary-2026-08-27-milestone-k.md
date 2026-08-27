# Phase summary — 2026-08-27 — Milestone K

## Outcome

Milestone K is implemented: one storyboard can produce multiple independently timed, captioned,
browser-verified, and human-reviewable language deliverables without copying the project. The first
fixture is `claude/projects/storyboard-to-video-pipeline-demo` with canonical `zh-Hant` and English.

The repository also advances its verified HyperFrames baseline from 0.8.11 to 0.8.16. This is an
empirical upgrade: every tracked composition was run through the strict browser gate after changing the
pin.

## What changed

- `hf` resolves known localizable fields explicitly. Spoken narration and lower-third subtitles are
  mandatory per variant; visual fallback is canonical-only and emits an exact audit warning.
- `--locale <id>` now flows through `html`, `prepare-tts`, `tts`, `measure`, `sync`, `captions`, `pipeline`,
  `check`, and `review`. Predictable namespaced outputs follow `design-v4.md` §2K.
- `project.json.deliverables` is a generated receipt per locale. Root duration and status remain canonical;
  review status is independent and defaults to `pending`.
- Browser checks and snapshots use an ignored one-entry locale projection. This satisfies HyperFrames
  0.8.16's `multiple_root_compositions` guard without renaming, swapping, or copying the source project.
- `hf check --all-locales` makes the repository browser gate discover every declared deliverable, so a
  new language cannot silently receive weaker CI coverage than the canonical composition.
- Locale entry generation renames `data-composition-id` and `window.__timelines` registration atomically.
- Review kits localize their interface and use `hf-review:<project>:<locale>` storage keys. English and
  canonical verdicts cannot overwrite each other.
- TTS reuse is now source-bound: the cache fingerprint includes spoken text, voice, rate, pitch, and
  volume. Each new clip retains a provider receipt with zero-charge metadata plus audio and word-boundary
  SHA-256 hashes, so a voice change cannot silently reuse an old MP3.
- Stale generated-region comparison ignores HyperFrames Studio's non-semantic `data-hf-id` editor
  annotations while continuing to compare actual structure and copy. This prevents a live editor session
  from looking like storyboard drift.
- The reusable schemas, template pin, repo instructions, README, TODO, upgrade notes, fixture runbook,
  and retrospective now describe the delivered contract.

## Fixture evidence

| Evidence | `zh-Hant` | `en` |
| --- | ---: | ---: |
| Voice | `zh-TW-HsiaoChenNeural` | `en-US-JennyNeural` |
| Narration measured by ffprobe | 68.57s | 67.73s |
| Audio-driven composition | 77.2s | 77.0s |
| Slide captions | 6 | 6 |
| Word-caption cues | 29 | 51 |
| HyperFrames strict contrast | 18/18 | 18/18 |
| Offline review kit | 6 frames + 6 clips | 6 frames + 6 clips |
| Human verdict | pending | pending |

English Edge-TTS synthesis used the established no-key path. It incurred no API or credit charge. No
image, video, or paid audio provider was used, and no MP4 was rendered.

## Verification completed locally

- `node --test shared/tests/hf.test.mjs`: 20/20 pass.
- `node shared/tools/hf.mjs audit --all`: 11 local projects (8 tracked), 0 errors, 0 warnings.
- `node shared/tools/hf.mjs repo-check`: pass.
- `hyperframes@0.8.16 check --strict`: seven canonical entries plus English, all zero findings;
  410/410 combined WCAG AA contrast checks.
- Review kits: desktop inspection for both locales and 390×844 inspection for English; six cards and six
  audio controls each, no English horizontal overflow, no console warnings.

The final pushed GitHub Actions run must be terminal green before this checkpoint is handed off.

## Human gates and next work

Open `review/index.html` and `review/en/index.html` locally. In each kit, play the complete cinema pass,
judge pronunciation, pacing, and readability, then copy the verdict. Passing one locale does not pass the
other. Render only the locale whose review has passed; new MP4s belong in GitHub Releases, not Git.

After those gates, the next evidence-led product decision is whether a full-frame registry composition
(Milestone I) adds more value than improving review publication and series identity. Do not decide that
from an unreviewed render.
