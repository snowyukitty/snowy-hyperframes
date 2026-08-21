# AGENTS.md — Snowy HyperFrames Workflows

Instructions for any coding agent (Claude Code, Codex, Pi, Gemini, Grok, …) working in
this repository. The workspace-level `AGENTS.md` one directory up (if present) outranks
this file; the project-level `project.json` / `docs/runbook.md` inside a specific
project is more specific than this file for that project only.

**Design of record for the current milestone:** `shared/docs/design-v2.md` (architecture, truth-vs-generated
contract, spec'd work items A–G with acceptance criteria). Read it before starting any work item.

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
npm run check         # hf audit + npx hyperframes@0.8.6 check   (0 errors required)
npm run review        # build the human gate kit (frames + narration, offline, shareable)
npm run render        # only after a human has actually passed the gate
```

Toolkit reference: `node shared/tools/hf.mjs help`. Commands: `new`, `html`,
`prepare-tts`, `tts`, `measure`, `sync`, `fit-audio`, `vendor`, `review`, `audit [--all]`,
`repo-check`, `pipeline`. Run `hf audit --all` and `hf repo-check` from the repo root
before committing; CI runs the same two commands plus `hyperframes lint` per project.

## Slide content

A slide's information layer is `slides[].blocks` in the storyboard — `lead`, `metrics`,
`cards`, `list`, `quote`, `source`. `hf html` renders them; `hf audit` enforces the
readable ranges (max 3 blocks/slide, 2-4 metrics, 2-3 cards, 2-5 list items). Never
hand-write that HTML, and never put a number on screen that `docs/references.md`
cannot account for. Live reference (one page per block type):
`claude/projects/block-vocabulary-reference`.

## HyperFrames version policy

- Pin the CLI per project via `npx --yes hyperframes@<version>` in `package.json`; the
  current line is **0.8.x** (`check` replaced `validate`/`inspect`/`layout`, which are
  deprecated aliases — do not use them in new scripts).
- `hyperframes.json` belongs to HyperFrames (registry/paths config). Snowy's slide
  manifest lives in `data/timeline.json` (generated) — never in `hyperframes.json`.
- GSAP is loaded from `vendor/gsap.min.js` (`hf vendor`), not a CDN: on a slow link the
  CDN alone blew the 10 s navigation timeout inside `hyperframes check`.
- Upgrade notes and empirical results: `shared/docs/hyperframes-0.8-upgrade-notes.md`.

## Conventions

- Project folder names are kebab-case: `<topic>-<format>-<purpose>`.
- Narration files: `assets/audio/slide-NN.display.txt` (viewer text, generated from the
  storyboard), `slide-NN.tts.txt` (after `data/pronunciation-map.json`), `slide-NN.mp3`.
- Default voice `zh-TW-HsiaoChenNeural`, rate `+5%`, pitch `-3Hz` (see playbook §4.5).
- Generated regions in `index.html` sit between `<!-- hf:audio:start/end -->` and
  `<!-- hf:slides:start/end -->`; edit the storyboard, not those regions. Everything
  outside the markers (CSS, timeline JS) is hand-authored and yours to improve.
- Chinese (zh-Hant) is the narrative language of the demos; docs may be zh-Hant or English.
  Keep `README.md` of a public project readable for someone who has never seen this repo.

## When you finish a work session

Update or add `shared/docs/phase-summary-<date>.md` (what changed, what was verified,
exact next steps), update the project's `docs/retrospective.md`, and keep
`project.json.status` honest (`draft` → `ready-to-preview` → `ready-to-render` →
`rendered`). Report skipped or failing checks explicitly — "done" means verified.
