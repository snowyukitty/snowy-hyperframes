# Phase summary — trilingual subtitle tracks and Agent Orchestrator review masters

Date: 2026-08-28

## Outcome

HyperFrames now distinguishes a complete spoken locale variant from a
subtitle-only translation. One canonical voice can produce selectable English,
Japanese, and Traditional Chinese SRT/VTT tracks that share exact cue IDs and
timestamps. Subtitle review is part of the human gate, not an untracked export
step.

The two local Agent Orchestrator candidates were rebuilt to use that contract:

| Candidate | Spoken master | Duration | Shared cues | Strict check | Human gate |
| --- | --- | ---: | ---: | --- | --- |
| Product overview | English, `en-US-JennyNeural` | 89.7 s | 19 × 3 tracks | 0 errors / 0 warnings, 48/48 contrast | pending |
| Five-hour pre-warm | English, `en-US-JennyNeural` | 87.8 s | 22 × 3 tracks | 0 errors / 0 warnings, 47/47 contrast | pending |

No MP4 was rendered, muxed, released, or committed. The project directories
remain ignored production work under the publication policy. Their offline
review kits are:

```text
claude/projects/agent-orchestrator-overview-promo/review/index.html
claude/projects/agent-orchestrator-5h-window-explainer/review/index.html
```

## Contract added

- `storyboard.json` may declare top-level `subtitleTracks` and per-slide
  `captionCues` with stable semantic IDs.
- The source track must match the canonical spoken locale. Its cue text must
  exactly partition each display narration after NFKC normalization and
  whitespace removal; every declared translation is required.
- Timing is generated once from canonical TTS word boundaries. Every language
  receives the same cue IDs, starts, and ends.
- `hf captions` and `hf sync` write
  `captions/subtitles.<locale>.{srt,vtt}`. `project.json` records locale labels,
  default/source authority, cue counts, density limits, paths, SHA-256 hashes,
  and per-track review states.
- `hf audit` reconstructs expected bytes and fails on missing word boundaries,
  transcript drift, missing translations, wrong source authority, edited
  timings, receipt/hash drift, undeclared leftovers, or over-dense cues.
- `hf review` adds synchronized language selectors, real-time cinema captions,
  per-slide gates for every track, and review-summary omissions. A slide cannot
  pass on voice gates alone.

## Evidence

- `node --check shared/tools/hf.mjs`
- `node --test shared/tests/hf.test.mjs` — 24/24 passing
- `npm run pipeline`, `npm run check`, and `npm run review` in both candidate
  projects
- Both projects generated three SRT and three WebVTT files with receipt hashes
  and self-contained 1.1 MB review kits containing six real frames and six real
  narration clips.

## Handoff

Snowy reviews the English voice and all three subtitle tracks in each local
kit. A passed gate authorizes render only. Publication remains a separate owner
action: GitHub Release assets should be a clean MP4 plus all sidecars, while the
field guide should use HTML `<track>` elements with English as default.
