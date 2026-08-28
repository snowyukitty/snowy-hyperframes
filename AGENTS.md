# AGENTS.md — Snowy HyperFrames Workflows

Instructions for any coding agent (Claude Code, Codex, Pi, Gemini, Grok, …) working in
this repository. The workspace-level `AGENTS.md` one directory up (if present) outranks
this file; the project-level `project.json` / `docs/runbook.md` inside a specific
project is more specific than this file for that project only.

**Start here, in this order:** [`TODO.md`](TODO.md) — what is open and who owns it ·
[`shared/docs/design-v4.md`](shared/docs/design-v4.md) — the current milestone, spec'd with acceptance
criteria · [`shared/docs/design-v2.md`](shared/docs/design-v2.md) §1 — the architecture contract
(truth vs generated, timing policy, toolkit API, template DOM), still binding ·
[`shared/docs/phase-summary-2026-08-28.md`](shared/docs/phase-summary-2026-08-28.md) — what the last
session built and verified.

## What this repository is

A public, research-grade record of **AI-assisted research-to-video production** on
top of [HyperFrames](https://github.com/heygen-com/hyperframes): workflow comparisons,
a reusable project template, shared schemas and tooling, and a small set of reviewed
demo projects (Traditional-Chinese narrated explainers with Edge-TTS, pronunciation
maps, audio-driven timelines). It is **not** an archive for every production video.

```text
snowy-hyperframes/
├── codex/projects/       Codex-driven projects
├── codex-pi/projects/    Codex orchestrates, Pi-compatible output
├── pi/projects/          Pi-driven, automation-first projects
├── claude/projects/      Claude Code-driven projects (uses the shared toolkit end to end)
└── shared/
    ├── tools/hf.mjs      the toolkit (zero-dependency Node ≥ 22) — use it, do not re-implement it
    ├── templates/        hyperframes-research-project/ — copy via `hf new <workflow>/<name>`
    ├── schemas/          project / storyboard / pronunciation-map / research JSON schemas
    ├── vendor/           gsap.min.js — vendored so check/render never depend on a CDN
    └── docs/             playbook, workflow comparison, publication policy, upgrade notes, phase summaries
```

## Non-negotiable rules

1. **One timing truth.** `data/storyboard.json` (intent) + `data/audio-durations.json`
   (measured by ffprobe) → `data/timeline.json` (generated) → `index.html`
   `data-start`/`data-duration`, `captions/narration.srt`, `project.json.durationSeconds`.
   Never hand-edit timing attributes; edit the storyboard or the audio and run `hf sync`.
   A narration MP3 longer than its slide is a release blocker (`hf audit` → `cut-risk`).
2. **Preview gate before render.** `npm run check` (= `hf audit` + `hyperframes check`)
   must pass, then a human judges pacing, pronunciation and readability. Give them
   `npm run review` — a self-contained kit (one frame + the real narration per slide,
   timing margins, per-slide verdicts, paste-ready summary) that opens offline and can
   be published for remote approval — or `npm run preview` for HyperFrames Studio.
   Only then `npm run render`. Never render merely because checks pass, and never
   record a gate as passed that a human did not actually perform.
3. **Publication is allowlist-only.** New project folders under `*/projects/` are
   git-ignored by default. Add a project to `.gitignore` only after the review in
   `shared/docs/repo-publication-policy.md`. `hf repo-check` enforces the guard.
4. **No secrets, ever.** Record *which* auth a project needs in `project.json.auth.required`;
   never the credential. Edge-TTS and local tools need no key.
5. **Renders are not source.** New MP4s go to GitHub Releases (or stay local), not into
   git history. The four 2026-06 demo renders remain for historical completeness.
6. **Sources are graded.** Research projects separate official / community / estimate in
   `data/research.json` + `docs/references.md` and set `project.json.sourceConfidence`.
   Never present an unpublished quota, price or capability as official.
7. **Image files are slide-specific.** No text baked into bitmaps; numbers and sources are
   HTML overlays. Reuse of one image across slides triggers HyperFrames duplicate-media
   warnings — copy to a slide-specific filename.

## The standard loop (from inside a project directory)

```powershell
npm run html          # (re)generate index.html slide/audio regions from the storyboard
npm run pipeline      # prepare-tts -> tts (Edge-TTS) -> measure (ffprobe) -> sync -> audit
npm run check         # hidden-window hf audit + hyperframes@0.8.16 check
npm run review        # build the human gate kit (frames + narration, offline, shareable)
npm run render        # only after a human has actually passed the gate
```

All project `lint`, `check`, `snapshot`, `doctor`, `preview`, `render`, and
`publish` scripts route the pinned HyperFrames CLI through `hf`. On Windows the
wrapper sets `windowsHide: true`; interactive commands still inherit terminal
I/O, but must not create extra foreground console windows. The wrapper also sets
`HYPERFRAMES_NO_TELEMETRY=1` on every `npx` child: the CLI's exit-time telemetry
uploader is a detached child without `windowsHide`, so with telemetry on, every
invocation flashes a visible console on Windows. Known residual: `hyperframes
preview` from a non-TTY shell picks background mode and its detached server
opens one persistent console window (upstream issue; run preview from a real
terminal or tolerate that single window).

Toolkit reference: `node shared/tools/hf.mjs help`. Commands: `new`, `html`,
`prepare-tts`, `tts`, `measure`, `sync`, `captions`, `fit-audio`, `vendor`, `review`, `check`, `audit [--all]`,
`lint`, `snapshot`, `doctor`, `preview`, `render`, `publish`, `repo-check`, `pipeline`. Run `hf audit --all` and `hf repo-check` from the repo root
before committing; CI also runs the zero-dependency regression tests and `hf check --strict --all-locales`
per composition project, so every declared deliverable receives the browser gate.

## Slide content

A slide's information layer is `slides[].blocks` in the storyboard — `lead`, `metrics`,
`cards`, `list`, `quote`, `source`, `chart`. `hf html` renders them; `hf audit` enforces the
readable ranges (max 3 blocks/slide, 2-4 metrics, 2-3 cards, 2-5 list items, bar 2-6,
split 2-4, line 1-2 series x <=12 points). Never hand-write that HTML, and never put a
number on screen that `docs/references.md` cannot account for. Live reference (one page
per block type): `claude/projects/block-vocabulary-reference`.

Two rules specific to charts, both enforced: **a chart must carry a `source`** — a drawn
comparison asserts more than a stated one — and **a chart that sets `min`/`max` discloses
it automatically** in its caption, so an axis can never be quietly zoomed to exaggerate a
difference.

A slide may also pick how it arrives: `motion: rise | hold | focus | reveal` (default
`rise`). Four is the whole vocabulary on purpose — a rhythm that needs a legend is a
design system, not a rhythm. It lives in the template's timeline script and changes
nothing about timing truth.

## HyperFrames version policy

- Pin the CLI per project with `"hyperframesVersion": "<version>"` in `package.json`;
  package scripts call the shared `hf` proxy, which resolves that pin before invoking
  `npx`. The verified baseline is **0.8.16** (`check` replaced
  `validate`/`inspect`/`layout`, which are deprecated aliases — do not use them in new scripts).
- `hyperframes.json` belongs to HyperFrames (registry/paths config). Snowy's slide
  manifest lives in `data/timeline.json` (generated) — never in `hyperframes.json`.
- GSAP is loaded from `vendor/gsap.min.js` (`hf vendor`), not a CDN: on a slow link the
  CDN alone blew the 10 s navigation timeout inside `hyperframes check`.
- Upgrade notes and empirical results: `shared/docs/hyperframes-0.8-upgrade-notes.md` and
  `shared/docs/phase-summary-2026-08-24.md`.

## Conventions

- Project folder names are kebab-case: `<topic>-<format>-<purpose>`.
- Narration files: `assets/audio/slide-NN.display.txt` (viewer text, generated from the
  storyboard), `slide-NN.tts.txt` (after `data/pronunciation-map.json`), `slide-NN.mp3`,
  `slide-NN.words.json` (the engine's word timings, captured during synthesis).
- Captions: `captions/narration.srt` is one cue per slide; `captions/narration.word.srt` is
  word-timed (`hf captions`). Cue **text** always comes from the display script, never from
  the TTS token stream — the tokens carry no punctuation and spell what is *heard*
  (`版本二`), not what should be *read* (`v2`).
- Subtitle-only translations use top-level `subtitleTracks` plus stable per-slide
  `captionCues`. Their source text must exactly partition the canonical narration; every
  declared language is required. `hf captions`/`hf sync` emit
  `captions/subtitles.<locale>.{srt,vtt}` from the canonical TTS word boundaries, so all
  languages share cue IDs and timestamps without creating extra audio or render variants.
  Each track has its own density limit and human review gate.
- Default zh-Hant voice `zh-TW-HsiaoChenNeural`, rate `+5%`, pitch `-3Hz` (see playbook
  §4.5). A project's declared canonical language owns its voice; English masters do not
  synthesize with the zh-Hant default.
- A locale variant is selected explicitly with `--locale <id>`. It owns namespaced audio,
  durations, timeline, captions, entry HTML, render target, and review verdict. Never copy a
  project to translate it, never machine-translate a missing spoken field, and never reuse one
  locale's human verdict for another. This is distinct from subtitle-only tracks, which keep
  one spoken master and one render. See `shared/docs/design-v4.md` §2.
- Generated regions in `index.html` sit between `<!-- hf:audio:start/end -->` and
  `<!-- hf:slides:start/end -->`; edit the storyboard, not those regions. Everything
  outside the markers (CSS, timeline JS) is hand-authored and yours to improve.
- The canonical narrative language is explicit in each storyboard; docs may be zh-Hant or
  English.
  Keep `README.md` of a public project readable for someone who has never seen this repo.

## When you finish a work session

Update or add `shared/docs/phase-summary-<date>.md` (what changed, what was verified,
exact next steps), update the project's `docs/retrospective.md`, and keep
`project.json.status` honest (`draft` → `ready-to-preview` → `ready-to-render` →
`rendered`). Report skipped or failing checks explicitly — "done" means verified.
