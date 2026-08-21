# Snowy HyperFrames — Design v2 (handoff document)

Status: **authoritative design for the next milestone** · Written 2026-08-22 (Claude Fable 5) ·
Intended reader: the next agent session (any model) implementing under this design.

Read in this order: `AGENTS.md` (rules) → this file (design + work items) →
`shared/docs/phase-summary-2026-08-22.md` (what exists today) →
`shared/docs/hyperframes-0.8-upgrade-notes.md` (empirical gotchas).

---

## 0. One-paragraph thesis

This repo's durable value is **research-grade, citation-disciplined, Traditional-Chinese narrated
explainer videos, reproducible from a single storyboard by any coding agent**. Upstream HyperFrames
(0.8.x) now ships generic agent skills, a local Kokoro TTS, transcription, a registry of blocks and a
`check` gate; we do **not** compete with that. We sit on top of it with four things upstream does not
have: (1) the zh-Hant narration discipline (Edge-TTS + display/TTS split + pronunciation map),
(2) the research-source grading discipline, (3) a *single timing truth* pipeline that makes
"MP3 longer than slide" impossible, and (4) four agent workflows that all produce the same project
shape, so any agent can take over any project. Everything in this design serves those four.

---

## 1. Architecture (as built, 2026-08-22)

```text
                 intent                    measurement                result (generated)
   data/storyboard.json  ──┐                                  ┌──►  data/timeline.json
   data/pronunciation-map ─┤   hf prepare-tts  hf tts  hf measure    │     index.html  (data-start / data-duration,
                           ├──► slide-NN.display.txt ─► .tts.txt ─► .mp3 ─► audio-durations.json ──► hf sync ─┤                  hf:* regions, GSAP reads DOM)
   hf html (template) ─────┘                                                                        │     captions/narration.srt
                                                                                                    └──►  project.json.durationSeconds
   gates:  hf audit (static, CI)  →  npx hyperframes@0.8.6 check (browser)  →  human preview  →  render (local; MP4 → Releases)
```

### 1.1 Files that are *truth* vs *generated*

| Truth (hand-edited) | Generated (never hand-edit) |
| --- | --- |
| `data/storyboard.json` — slides: `id,title,chapter,durationTarget,image,subtitle,narration`, plus `voice{}` | `data/timeline.json`, `data/audio-durations.json` |
| `data/pronunciation-map.json` — `entries[{match,tts,reason,matchType?,enabled?}]` (legacy `rules[]` accepted) | `assets/audio/slide-NN.display.txt` (from narration), `slide-NN.tts.txt`, `slide-NN.mp3` |
| `index.html` **outside** the `<!-- hf:audio -->` / `<!-- hf:slides -->` markers (CSS, timeline JS) | `index.html` **inside** the markers; all `data-start`/`data-duration` attributes everywhere |
| `project.json` (except `durationSeconds`, `updatedAt`, `timing`, `checks`) | `captions/narration.srt` |
| `data/research.json`, `docs/references.md`, `docs/runbook.md`, `docs/retrospective.md` | `renders/*.mp4` (local only) |
| `hyperframes.json` = **upstream** config (`registry`, `paths`) — Snowy never stores timing there | `vendor/gsap.min.js` (copied from `shared/vendor/` by `hf vendor` / `hf new`, committed for runnable demos) |

### 1.2 Timing policy (`hf sync`)

- `audio` (default): `slide.duration = max(durationTarget, ceil0.1(mp3 + pad))`, `pad = 0.6 s`;
  audio clip slot `= round0.01(mp3)` (exact media length → no upstream `clip_media_fit` warning);
  starts are cumulative, rounded to 0.1 s; root `data-duration` = last end.
- `storyboard`: `slide.duration = durationTarget`; **fails** if any mp3 > target + 0.25 s.
- Legacy demos are never re-timed; `hf fit-audio` only tightens audio slots and root duration.

### 1.3 Toolkit contract (`shared/tools/hf.mjs`, zero deps, Node ≥ 22)

Commands and exit codes are stable API; CI depends on `audit --all` and `repo-check` returning
non-zero on errors. Warnings never fail. `--json` on `audit` / `repo-check` emits machine output.
Add new commands as new functions registered in the `commands` map; do not introduce npm
dependencies (the toolkit must run from a bare checkout with only Node + FFmpeg + edge-tts).

### 1.4 Template contract (`shared/templates/hyperframes-research-project/`)

- `index.html` must pass `npx hyperframes@0.8.6 check` with **zero** findings on a storyboard with
  no images (font `@font-face local(...)`, no decorative *text*, contrast ≥ 4.5:1 for body, ≥ 3:1 large).
- Per-slide DOM: `<section id="slide-NN" class="clip slide [no-image] [chapter]" style="--i:n" data-start data-duration data-track-index>` containing
  `.bg`(img) **or** `.bg.bg-generated` + `svg.deco`, `.shade`, `.content > .eyebrow + h1`, `.caption`, `.progress`.
- `<audio id="audio-slide-NN" class="clip narration-audio" data-track-index="20+n">` — one per slide, hidden by CSS, never `controls`.
- GSAP positions come from `slide.dataset.start`; there must be no second timing array.

---

## 2. Work items for the next milestone

Milestone name: **"研究型 zh-Hant 解說影片，一條指令可重跑"** — a *real* research video produced on
the new pipeline, with information-dense image-free slides, accurate captions, a music bed, and a
local no-API-key TTS option measured against Edge-TTS.

Each item below is self-contained: scope, spec, files, acceptance. Suggested order: A → B → C → D → E → F → G.
**Status 2026-08-22 (end of second session): B, B2, C, D (harness) and F are built and verified.
A, D (listening), E and G remain — every open item now needs a human's ears or account, not code.**
Items B, C, D are independent of each other and can run in parallel sessions.

### A. Human preview gate for the existing demo (15 min, human + agent)

- Run `npm run preview` in `claude/projects/storyboard-to-video-pipeline-demo`; listen for pronunciation
  (`hf audit` / `H F audit`, `storyboard`), pacing, caption readability.
- If fixes are needed: edit `data/storyboard.json` or `data/pronunciation-map.json` → `npm run pipeline` → `npm run check`.
- Then: `project.json.status = "rendered"`, `checks.humanPreview = "pass <date>"`, upload
  `renders/storyboard-to-video-pipeline-demo.mp4` as a **GitHub Release asset** (tag `demo-pipeline-v1`),
  link it from the project README. Do **not** commit the MP4.
- Acceptance: status honest, Release exists, `hf repo-check` still clean.

### B. Template content blocks — information density without bitmaps ✅ BUILT 2026-08-22

**Shipped.** Storyboard slides take an optional `blocks: []`; `hf html` renders them; `hf audit` polices density.

```jsonc
"blocks": [
  { "type": "lead",    "text": "一句話導語" },
  { "type": "metrics", "items": [ { "label": "量測", "value": "ffprobe", "note": "每段 MP3 的實際秒數" } ] },  // 2-4
  { "type": "cards",   "items": [ { "title": "官方", "text": "廠商公布的數字" } ] },                            // 2-3
  { "type": "list",    "items": ["…"], "ordered": true },                                                       // 2-5
  { "type": "quote",   "text": "…", "source": "…" },
  { "type": "source",  "text": "資料：…" }
]
```

As-built layout contract (differs from the sketch above it — the sketch put blocks in the normal
flow after `h1`, which left the lower half of a 1920×1080 frame empty):

- a slide with blocks gets `with-blocks`: the content column becomes a **band** (`inset: 92px 96px 220px 96px`,
  i.e. everything above the lower-third caption), `h1` drops to 60px, and `.blocks` is a flex column with
  `justify-content: center` so the group sits optically centred in whatever the title leaves;
- grids cap their cell width (`--n * 470px` metrics, `--n * 540px` cards) so a 2-up row is not two half-empty billboards;
- every small-text surface paints its own dark panel — contrast survives any background art;
- chapter classes are namespaced `chapter-<slug>` (a chapter literally named `quote` used to inherit the
  `.quote` block style and blew the layout by 263px — that is why);
- entrance motion: `.blocks > *` staggered 0.12s at `start + 0.72`.

Audit codes: `block-type` (error, unknown type) · `block-shape` · `block-density` · plus `stale-html`,
which fires when the generated region no longer matches the storyboard, and `placeholder`, which fires
when a template string like "Replace with project title" is still in `project.json` — that one was earned
by publishing a review kit titled *Replace with project title*, because the kit had been built before the
metadata was filled in. Anything a generator embeds must be audited before it can be published.

**Verified:** `claude/projects/block-vocabulary-reference` (one page per block type) — `hf audit` 0 findings,
`hyperframes@0.8.6 check` lint 0/0, runtime 0/0, layout 0 issues / 9 samples, motion 0/0, **contrast 53/53 AA**.
Deferred, still open: a `chart` block backed by the upstream registry `data-chart`.

### B2. The review kit — `hf review` ✅ BUILT 2026-08-22 (not in the original plan)

The gate in rule 2 was the pipeline's weakest link: it demanded a human, but cost them a dev server and a
timeline scrub, so in practice it got skipped. `hf review` builds **one self-contained HTML** — per slide a
real frame (`hyperframes snapshot` → ffmpeg → inline JPEG), the real narration MP3 inlined, the caption, the
narration script, and start / slide / narration / **margin** chips colour-coded by cut risk. It has:

- a **cinema mode** that plays the clips in order with the frames and captions — the pacing judgement the
  gate actually asks for, without a render;
- three per-slide verdicts (發音 / 節奏 / 可讀性) + a note, persisted in `localStorage`;
- **複製審核結論** → a markdown approval summary to paste into `docs/retrospective.md` or back to the agent.

`--artifact` emits a body-only variant for publishing (so the gate can happen from a phone, away from the
render machine). Kits live in `review/` and are git-ignored. Windows note: `npx.cmd` needs `shell:true`
(Node ≥ 20 EINVAL) — `runNpx()` handles it.

### C. Word-level captions ✅ BUILT 2026-08-22

**Shipped**, but not the way the sketch below planned it. Neither of the sketch's two sources was right:
the `edge-tts` CLI collapses `--write-subtitles` to one cue per sentence, and re-deriving timings with
`hyperframes transcribe` would cost a model download and risk mis-transcribing the zh-Hant it just spoke.

What is built instead splits the job between the two sources that are each authoritative for half of it:

- **the clock** comes from the engine: `shared/tools/edge_tts_words.py` synthesizes with
  `boundary="WordBoundary"` (the 7.x default is `SentenceBoundary`, which is why the CLI loses this) and
  writes `assets/audio/<slide>.words.json` next to the MP3 **in the same pass** — `hf tts` prefers this
  helper and falls back to the CLI (announcing that word timings are unavailable);
- **the text** comes from `slide-NN.display.txt`: the boundary stream carries no punctuation and splits
  `storyboard` into two tokens, so cues cut from it read *worse* than the paragraph they replace. Cues are
  cut from the display script at punctuation (`--max-chars`, default 18, never cutting through an
  identifier like `project.json`) and placed on the clock by matching spoken weight against the token
  stream (CJK glyph = 1 beat, latin char = 0.5).

`hf captions [--mode word|slide|both] [--max-chars 18]` → `captions/narration.word.srt`; `hf sync`
refreshes it whenever word data exists. `hf audit` checks cue count, containment in the composition, and
overlap.

**Verified** on the pipeline demo: 29 cues, 7-26 chars (median 15). Alignment measured by comparing each
cue's characters against the tokens actually spoken inside its window: **mean overlap 0.970**. The one
outlier — caption `工作流 v2。` against spoken `版本二` — is the pronunciation map working as designed, and is
the evidence that captions must come from the display script rather than the boundary stream.

<details><summary>Original sketch (superseded)</summary>

**Spec.** New command `hf captions [--mode slide|word] [--max-chars 18]`.
- `slide` (today's behaviour) stays default inside `sync`.
- `word`: source of word timings, in order of preference:
  1. Edge-TTS `--write-subtitles slide-NN.edge.vtt` (already supported by `hf tts --subtitles`; cue = word/phrase chunks) → offset by slide start;
  2. `npx hyperframes@0.8.6 transcribe assets/audio/slide-NN.mp3` (upstream, word timings JSON) when the VTT is missing.
  Build cues by packing words up to `--max-chars` CJK characters, never crossing a slide boundary; write
  `captions/narration.word.srt` (keep `narration.srt` as the slide-level file).
- Optional on-screen kinetic captions: **not** in scope here (upstream `/embedded-captions` exists; evaluate later).
- **Acceptance:** cue count > slide count, every cue inside its slide window (add this check to `hf audit` for the word file), SRT loads in VLC over the render without drift > 200 ms at slide boundaries.

</details>

### D. No-API-key TTS bakeoff ✅ HARNESS BUILT 2026-08-22 · listening test pending

**Shipped:** `hf bakeoff` + `claude/projects/tts-bakeoff-2026-08` (private until it has a result).
8 golden samples × 2 engines = 16 clips, each measured (length, rate, articulation rate, pause count,
silence ratio, LUFS, true peak, RTF) into `data/measurements.json`, plus a **blind** A/B listening kit
(`bakeoff/index.html`, `--artifact` to publish) where engine labels *and* the objective numbers stay
hidden until the listener presses 揭曉.

Objective findings are already in `shared/docs/local-tts-no-api-key-strategy.md` §3.5: Kokoro is 20%
slower on the same script (122.2s vs 101.5s), leaves far less silence (7% vs 21% — it mostly does not
breathe at punctuation), is quieter and less consistent in loudness (−20.7 LUFS sd 0.36 vs −19.1 sd 0.20),
and slows to 2.95 beats/s on latin acronyms (sample-07) against Edge's 3.97. Kokoro needs
`pip install kokoro-onnx soundfile` and a one-time ~311 MB model; after that it is fully offline.

**Still open (needs a human, ~10 min):** the naturalness verdict. Nothing about "which sounds better"
may be written until the blind test is done — measurements can rank consistency and cost, never taste.
Then: fill `docs/listening-scorecard.md`, update strategy §3.5, decide whether `hf tts` gains
`--provider kokoro` (the code already exists inside `hf bakeoff`), and decide whether the project
becomes public.

<details><summary>Original sketch (superseded)</summary>

- If `codex/projects/tts-local-bakeoff` is found on another machine, bring it back (it is git-ignored). Otherwise recreate the
  8 golden samples from `shared/docs/local-tts-no-api-key-strategy.md` §4 as `data/storyboard.json` slides in a **private**
  project `claude/projects/tts-bakeoff-2026-08` (not allowlisted).
- Providers: Edge-TTS (`hf tts`) vs Kokoro via `npx hyperframes@0.8.6 tts --voice zf_xiaobei --lang zh` (and one `zm_*`).
  Output contract from the strategy doc §3: `slide-NN.<provider>.mp3` + `.provider.json` + `.duration.json`.
  Add `hf tts --provider kokoro` that shells out to the upstream CLI and writes that contract (do **not** re-implement Kokoro).
- Scorecard: `docs/listening-scorecard.md` (5 axes × 8 samples × 2–3 voices). Measure durations with `hf measure`.
- **Acceptance:** strategy doc gets a dated "實測結果" section with the table and a recommendation
  (keep Edge-TTS default / switch / per-project choice); nothing private leaks into public docs (no audio paths with personal data).

</details>

### E. Music bed ✅ HALF BUILT 2026-08-22 (the half that needs no account) · carve still open

**Shipped:** a storyboard may declare `music: { file, volume }`. `hf html` emits
`<audio id="bgm" class="clip music-bed" data-track-index="19" data-volume="…">` spanning the whole
composition, `hf sync` keeps its window in step, and `hf audit` checks four things: the file exists,
it is **long enough** (a short bed is silently truncated by `clip_media_fit`), the volume is in a sane
range, and — the useful one — **where the bed will actually land**, from its own measured loudness times
the volume. That check was earned: the first verification bed was synthesized at −52 LUFS, so at volume
0.14 it rendered as pure silence and the feature looked broken when it was not.

Measured on a real 210 s render: a bed mastered to **−20 LUFS at volume 0.14 lands at −37.7 LUFS**
against narration at **−15.8** — **22 dB** of separation, comfortably past this item's ≥12 dB bar.
`audit` reports the predicted landing so the number is chosen, not guessed.

**Still open:** sourcing a track (bring your own, or upstream `/media-use` — signing into the `heygen`
CLI is an account action and needs Snowy's say-so), and dynamic voiceover carve (upstream
`/hyperframes-audio`). A fixed low bed needs no ducking for narration-led research video.

<details><summary>Original sketch (superseded)</summary>

- Use upstream `/media-use` (`resolve --type bgm`, needs `heygen` CLI sign-in — ask Snowy before signing in; it is an account action)
  or a local CC0 track placed by hand in `assets/audio/bgm.mp3`; mix with upstream `/hyperframes-audio` voiceover carve.
- Template: one `<audio id="bgm" class="clip" data-track-index="19" data-volume="0.18">` spanning the composition when
  `storyboard.music = { file, volume }` is present; `hf html` emits it; `hf audit` verifies the file exists and duration ≥ total.
- **Acceptance:** render with narration clearly above the bed (LUFS difference ≥ 12 dB by ffmpeg `ebur128` on a narration segment vs a gap).

</details>

### F. First real research video ✅ BUILT 2026-08-22

**Shipped:** `claude/projects/measurable-vs-audible-tts` — 10 slides, 210.5 s, zero bitmaps, Edge-TTS.
Topic as recommended (the TTS ladder), but framed around the honest gap instead of a verdict:
*可以量的，跟只能聽的* — what is measurable about a narration engine, and why the rest needs ears.
Every number traces to `tts-bakeoff-2026-08/data/measurements.json`; every findings slide footnotes its
instrument (ffprobe / silencedetect / ebur128); the closing slide states that the video has not passed
its own human gate.

`hf audit` 0 findings · `hyperframes@0.8.6 check` 0 findings (contrast **58/58 AA**) · render 3m30.5 s,
13.6 MB, 1m18.8 s. Status `ready-to-preview`, review kit published as an Artifact, render not committed.

Craft note worth keeping: the first pass used estimated `durationTarget`s and left 44 s of dead air in
242 s. Re-fitting the targets to *measured narration + 1.2 s* after the first TTS pass brought it to
210.5 s with ~12 s of hold. Estimate the storyboard, then let the audio correct it — the timeline rule,
applied to pacing.

<details><summary>Original sketch (superseded)</summary>

- Topic (recommended): **「2026 no-API-key TTS 階梯：Edge-TTS vs Kokoro 實測」** — it turns D's results into content and
  needs no external image generation. Workflow: `claude` (or `codex` if Codex drives). 8–10 slides, 3–4 min.
- Research discipline: `data/research.json` + `docs/references.md` with official / community / estimate layers;
  `sourceConfidence` set honestly; numbers shown as HTML blocks (B), never baked into images.
- Publish only after the policy review in `repo-publication-policy.md`; render → Release asset.
- **Acceptance:** `hf audit` 0 errors, `check` 0 findings, human preview done, Release published, README lists it.

</details>

### G. Portfolio hygiene (separate scope — ask before touching sibling repos)

- `snowy-repo-atlas`: registry says 3 workflows, canonical language `en`, checkout status; update to 4 workflows,
  note zh-Hant narrative / bilingual docs, and that renders live in Releases. This is a **different repository**; do it in
  its own session with explicit scope.
- Optional here: an English `README.en.md` (the root README already has an English summary paragraph).

---

## 3. Decisions already made (do not re-open without a reason)

| Decision | Why |
| --- | --- |
| Toolkit is a single zero-dependency Node file | Works from a bare clone; no install step; four agent runtimes share it |
| `hyperframes.json` is upstream's; timing lives in `data/timeline.json` | Upstream schema is strict; `hyperframes add` / Studio read it |
| GSAP vendored per project | CDN fetch blew the 10 s `check` timeout here; determinism |
| Audio slot = exact MP3 length, slide = mp3 + 0.6 s (audio policy) | Matches upstream `clip_media_fit`; no cut-offs; no trailing dead air beyond 0.6 s |
| Decorative elements are SVG shapes, not text | `check` contrast/occlusion treats any text as content |
| Renders → GitHub Releases, never git | Repo already carries 127 MB of 2026-06 MP4s; keep it cloneable |
| New projects git-ignored until allowlisted; CI enforces | Public repo; default-deny |
| Legacy demos modernized but **not re-timed** | Their published MP4s match their timelines |
| Edge-TTS stays the default voice path; Kokoro is evaluated, not assumed | Quality must be measured on golden samples first (playbook lesson) |

## 4. How to verify anything you change

```powershell
node shared/tools/hf.mjs audit --all          # must be 0 errors
node shared/tools/hf.mjs repo-check           # must be clean
cd <project> && npm run check                 # hyperframes@0.8.6 check: 0 findings
npx hyperframes@0.8.6 snapshot --at <t1>,<t2> # look at the frames you touched
```

Report failures with their output; name skipped checks as skipped; "done" means verified.
When a session ends, append a `shared/docs/phase-summary-<date>.md` and update `project.json.status` honestly.
