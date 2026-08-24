# Snowy HyperFrames — Design v3 (delivered milestone)

Status: **delivered 2026-08-22** · Written 2026-08-22 (Claude Opus 5) ·
Superseded by [`design-v4.md`](design-v4.md). `design-v2.md` §1 remains the architecture contract.

Read in this order: `AGENTS.md` (rules) → `TODO.md` (what is open, and who owns it) → this file →
`design-v2.md` §1 (the architecture contract, still authoritative) →
`shared/docs/phase-summary-2026-08-22c.md` (what the last session actually did).

---

## 0. Where the project stands

The pipeline works end to end and is honest about its limits. One storyboard produces a timed,
captioned, narrated 1080p research video; `hf audit --all` reports 0 errors across 8 projects; every
composition passes `hyperframes@0.8.6 check` with 0 findings and full WCAG AA contrast; CI is green.
Three videos exist, one of them a genuine piece of original research.

What the pipeline still cannot do is the subject of this design: **it can state a number, but it cannot
show one**, and after three minutes every slide arrives the same way. A research video that never draws
a comparison and never varies its rhythm is a slide deck with a voice track. That is the ceiling to lift.

**Two standing constraints that shape every choice below.** This machine's network is slow enough that
anything fetching at render time is a defect, not a preference (a 72 KB CDN script cost 7.7 s and blew
`check`'s 10 s navigation timeout). And the toolkit is one zero-dependency Node file by design — it has
to run from a bare checkout with only Node, FFmpeg and edge-tts present.

---

## 1. Contracts that carry forward unchanged

`design-v2.md` §1 remains the architecture contract: truth-vs-generated files, the timing policy, the
toolkit API, the template DOM. Added since, and equally binding:

| Contract | Where |
| --- | --- |
| Block vocabulary (`lead`/`metrics`/`cards`/`list`/`quote`/`source`) + density limits | `design-v2.md` §2B, `claude/projects/block-vocabulary-reference` |
| Caption text comes from the display script; caption time comes from the engine's word boundaries | `design-v2.md` §2C |
| The human gate is a generated kit (`hf review`), not a dev server | `design-v2.md` §2B2 |
| Subjective quality is decided by a blind test, never inferred from measurements | `design-v2.md` §2D |
| A music bed is judged by where it lands: `LUFS + 20·log10(volume)` | `design-v2.md` §2E |
| Anything a generator embeds is audited before it can be published | `hf audit` → `placeholder` |

---

## 2. The milestone — **「讓研究影片能 show 資料，而不只是說」** — H and J delivered 2026-08-22

Three work items. **H (charts) and J (motion) are built and verified**; **I stays open** as optional
depth. The research video now draws three of its findings and varies its rhythm across ten slides.

### H. A native `chart` block ✅ BUILT 2026-08-22

**Shipped**, and the "why native" reasoning above held up under test. Three kinds:

```jsonc
{ "type": "chart", "chart": "bar",  "unit": "拍／秒",
  "items": [ { "label": "Edge-TTS", "value": 4.42 },
             { "label": "Kokoro-82M", "value": 3.63, "emphasis": true } ],
  "source": "…" }                                   // REQUIRED — hf audit errors without it
{ "type": "chart", "chart": "split", "items": [ { "label": "旁白發聲", "value": 79, "display": "79%" }, … ] }
{ "type": "chart", "chart": "line", "min": 2.5, "max": 5.5, "labels": ["01", …],
  "series": [ { "label": "Edge-TTS", "last": "4.53", "values": [4.37, 5.08, …] } ] }
```

As-built decisions worth keeping:

- **Bars and splits are HTML boxes, only the line is SVG.** The sketch said "inline SVG" throughout;
  in practice SVG renders CJK labels and tabular numerals badly, and a bar is a box with a number
  beside it. SVG earns its place only where geometry is the content.
- **Every fill animates by `transform`, never `width`** — a width tween re-lays out every frame.
  Lines draw along `pathLength="1"`, which makes the reveal exact without measuring geometry.
- **A truncated axis discloses itself.** If a chart sets `min` (line) or `max` (bar), the renderer
  appends 「（縱軸自 X 起）」 to the caption automatically. An author cannot quietly zoom an axis to make
  a difference look bigger — the chart says so, every time, in the frame.
- **`source` is mandatory** (`hf audit` → `chart` error): a drawn comparison asserts more than a
  stated one, so it must be attributable.
- Density: bar 2–6, split 2–4, line 1–2 series × ≤12 points.

**Bug worth remembering:** the first line chart rendered as scattered dashes. Cause: a viewBox stretched
non-uniformly (`preserveAspectRatio="none"`) combined with `vector-effect: non-scaling-stroke` broke
`pathLength` dash normalisation. Fix: draw in near-pixel user units (1560×300) so scaling stays uniform.

**Verified.** `claude/projects/block-vocabulary-reference` gained one page per kind
(`hyperframes check` 0 findings, contrast 54/54 AA), and the research video now *draws* three of its
findings instead of stating them — speed as bars, the silence surprise as an emphasised bar, and the
per-sample trend as a line where the sample-07 dip is visible rather than described.

<details><summary>Original sketch (superseded)</summary>

**Why native rather than upstream.** Probed on 2026-08-22: upstream's `data-chart` is a **full-frame,
light-themed (`--bg-color: #faf9f6`), 15-second standalone composition**, mounted via
`data-composition-src` — it is a whole slide, not something that sits in our block band beside a title
and a caption. It also ships a CDN `<script>` for GSAP. For a chart *inside* a slide, ours must be
inline SVG: zero dependencies, our palette, deterministic offline.

**Spec.** A new block type:

```jsonc
{ "type": "chart", "chart": "bar",              // bar | line | split
  "unit": "LUFS", "max": 5,                      // optional axis hints
  "items": [ { "label": "Edge-TTS", "value": 4.42, "note": "拍／秒" },
             { "label": "Kokoro",   "value": 3.63 } ],
  "source": "data/measurements.json" }           // REQUIRED on a chart
```

- Rendered as inline `<svg>` inside `.blocks`, sized to the band, using the existing tokens
  (accent `#94f0e7` for the primary series, warm `#ffe6a3` for the comparison series).
- `bar`: horizontal bars, label left, value right in tabular numerals — the shape that reads fastest at
  1080p for 2–6 categories. `line`: 1–2 series, ≤12 points, endpoint emphasised. `split`: a single
  100 %-stacked bar for a share/ratio (e.g. 21 % silence vs 7 %).
- Bars/lines animate from zero via the existing per-slide GSAP loop, seek-safe (`scaleX` with
  `transform-origin: left`, never width animation — width tweens re-layout every frame).
- Every value also appears as **text** next to its mark. A chart whose numbers only exist as geometry
  fails both accessibility and this repo's citation discipline.

**Audit.** `chart` joins `BLOCK_TYPES`: unknown `chart` kind → error; `bar` outside 2–6 items or `line`
outside 1–2 series / 12 points → `block-density` warning; **a chart with no `source` → error**, because
a drawn comparison makes a stronger claim than a stated one.

**Acceptance.** Add one page per chart kind to `block-vocabulary-reference`; `hf audit` 0 findings;
`hyperframes@0.8.6 check` 0 findings including contrast; inspect `snapshot` frames — every label legible,
nothing overflowing the band; the numbers on screen match the cited file.

</details>

### I. A full-frame data slide from the registry (optional depth)

For a single deliberate "here is the data" moment, upstream's block is better than anything we would
hand-roll. Two facts to work with, both verified 2026-08-22:

- `npx hyperframes@0.8.6 add data-chart` **works** here (~10 s) and writes
  `compositions/data-chart.html` plus an include snippet;
- `npx hyperframes@0.8.6 catalog --query …` **does not** — it fetches every registry item and times out
  on this link. Browse the catalog on the web instead, then `add` by name.

**Spec.** Storyboard slide gains an optional `composition: "compositions/data-chart.html"`. When present,
`hf html` emits `<div data-composition-src="…" data-duration="…" data-width="1920" data-height="1080">`
instead of the normal slide body, keeping the narration clip and caption. Re-tokenise the block's CSS
custom properties to the dark palette; run `hf vendor` (which since 2026-08-22 also rewrites
`compositions/*.html`, resolving `../vendor/gsap.min.js` at the right depth).

**Acceptance.** A slide using it passes `check` with 0 findings — in particular no CDN request in the
runtime stage — and its 15 s default duration is reconciled with the narration by `hf sync` like any
other slide.

### J. A small motion vocabulary ✅ BUILT 2026-08-22

**Shipped exactly as specified** — four values, implemented entirely in the template's timeline script,
emitted by `hf html` as `data-motion`, validated by `hf audit` (`motion` error on an unknown value).
`rise` (default) · `hold` (background only; the text is already on screen) · `focus` (slow push-in, the
title lands late) · `reveal` (the evidence arrives after the sentence that sets it up).

The research video uses `focus` for its opening, its limits slide and its close, `reveal` for the four
findings slides, `rise` elsewhere. The fixture exercises all four so a template change that breaks one
shows up in its snapshots.

**Seek-safety verified the way it must be** — one `snapshot` pass at 0.4 s past each slide's start:
`hold` slides are already complete at +0.4 s, `reveal` slides show title-without-evidence, `focus`
slides are still settling. Every frame is consistent with its absolute time rather than playback
history, which is the property a renderer depends on. `check`'s motion stage: 0 findings.

<details><summary>Original sketch (superseded)</summary>

**Why.** Every slide currently enters identically: background scale, eyebrow, title, progress, caption.
Over ten slides that reads as a template rather than a piece.

**Spec.** Optional `motion` on a storyboard slide, defaulting to today's behaviour:

| value | reads as | use for |
| --- | --- | --- |
| `rise` (default) | current entrance | body slides |
| `hold` | background only; text already present | a slide that continues the previous thought |
| `focus` | background settles from a slow push-in, title lands late | chapter openings |
| `reveal` | blocks stagger in on the narration's first beat rather than a fixed offset | findings slides |

Implemented entirely in the template's timeline script (a map from `slide.dataset.motion` to a GSAP
recipe), so `hf html` only has to emit the attribute and nothing about timing truth changes.
Keep it to four. A motion vocabulary that needs a legend is a design system, not a rhythm.

**Acceptance.** `check`'s motion stage 0 findings; snapshots at 0.3 s, mid-slide and 0.3 s before the end
of a slide of each kind look correct (seek-safety: a rendered frame must not depend on playback history);
contact sheet of the full render inspected at every transition.

</details>

---

## 3. Secondary track — reach

### K. Bilingual narration from one storyboard

The display/TTS split already separates *what is read* from *what is spoken*, so a second language is a
second spoken track over the same intent. Suggested shape: `narration` and `subtitle` accept either a
string (today) or `{ "zh-Hant": …, "en": … }`; `hf tts --track en` writes `assets/audio/en/slide-NN.mp3`
with a voice from `voice.tracks.en`; `hf sync --track en` writes `data/timeline.en.json`,
`captions/narration.en.srt` and `index.en.html`; render target `renders/<id>.en.mp4`.
**Acceptance:** both renders pass `check`; both caption files align (the 0.970 overlap method); the
storyboard remains the single source — no second script file.

### L. Series identity

A title card, an end card, and a per-chapter accent, defined once in the template as tokens rather than
per project. Only worth doing once three or more videos are published; until then it is decoration.

---

## 4. Carried over from v2 — open, and why

| Item | Owner | Note |
| --- | --- | --- |
| **A** · human preview gate on two videos | **Snowy** | Both kits published as Artifacts; ~10 min each. Then status → `rendered`, MP4 → GitHub Release (never git). |
| **D (second half)** · blind TTS listening test | **Snowy** | Kit published. Until it is done, no naturalness claim may be written anywhere. |
| **E (second half)** · a real music track + dynamic carve | **Snowy first** | `/media-use` needs a `heygen` CLI sign-in — an account action. The plumbing is done and measured. |
| **G** · Atlas registry refresh | any agent, **separate scope** | Different repository. 4 workflows, 8 tracked projects, port 3002 still preview. |
| optional | any agent | `hf tts --provider kokoro` (code already lives inside `hf bakeoff`) — decide *after* the listening test; `README.en.md`. |

---

## 5. Rules for whoever picks this up

1. **Run `node shared/tools/hf.mjs audit --all` before and after.** It is the cheapest description of
   the repo's health, and it encodes every trap previous sessions paid for.
2. **Verify by rendering and looking.** Every defect worth fixing in the last two sessions was invisible
   in the source and obvious in a frame: a 263 px overflow, an inaudible bed, a caption cut mid-identifier.
3. **Never write a subjective conclusion the tooling cannot support.** Measure what is measurable, and
   make the human step cheap enough that it actually happens. That is this project's whole method.
4. **Leave the next session a summary.** `shared/docs/phase-summary-<date>.md`, honest about what was
   skipped, plus `TODO.md` updated.
