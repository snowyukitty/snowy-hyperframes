# Snowy HyperFrames — Design v4 (current design of record)

Status: **authoritative design for the next milestone** · 2026-08-24 ·
`design-v3.md` is delivered; `design-v2.md` §1 remains the architecture contract.

Read in this order: `AGENTS.md` → `TODO.md` → this file → `design-v2.md` §1 →
`phase-summary-2026-08-24.md`.

## 0. Review conclusion

The repository no longer needs another isolated visual block. Its durable strengths are already clear:

- one storyboard and one measured timing truth;
- explicit research provenance and confidence tiers;
- display/TTS text separation for zh-Hant narration;
- an offline human-review gate instead of an informal preview request;
- deterministic, network-free rendering inputs;
- several agent workflows that converge on the same project shape.

The next ceiling is **reach without duplication**. Today a project can produce one strong zh-Hant
deliverable. A second spoken language would require copying the project and allowing its timing,
captions, review status, and later fixes to drift. The next product milestone is therefore:

> **One storyboard, multiple independently reviewable language deliverables.**

Before taking that on, the base needed a reliability milestone. That foundation is delivered in this
review and is part of the v4 contract below.

## 1. Foundation M — trustworthy, non-disruptive verification ✅ delivered 2026-08-24

### M1. HyperFrames 0.8.11 baseline

All seven composition projects and the reusable template pin `hyperframes@0.8.11`. This moves the repo
past 0.8.6 with the upstream security fix, Windows child-process fixes, caption-heavy render fix, and
the audio group / FX / voiceover-carve model.

The upgrade was proven with the strict browser gate on all seven compositions, not inferred from a
changelog. The gate exposed and the session fixed:

- a line-chart endpoint clipped by 7 px;
- a research composition over the maintainability threshold;
- a legacy source note hidden under its caption;
- a Pi composition shifted 42 px beyond the canvas by normal-flow header geometry;
- a storyboard still naming shared images after its HTML had moved to slide-specific copies.

### M2. Verification must not interrupt the workstation

`hf` launches non-interactive children with Node's `windowsHide: true`. `npm run check` now calls
`hf check`, which runs static audit and the pinned HyperFrames browser gate behind that hidden boundary.
Browser gates run sequentially during local work; CI may run them without this workstation concern.

Interactive commands remain interactive by intent: `npm run preview` may open Studio because the user
asked to preview. Audit, check, TTS, FFprobe, FFmpeg, snapshot, and render helpers must not flash console
windows across the desktop.

### M3. Explicit regression contracts

`shared/tests/hf.test.mjs` uses only `node:test`. It protects timing, legacy GSAP start patching,
identifier-safe caption packing, chart viewport geometry, semantic audio groups, compact generated DOM,
and the minimal schema validator. CI runs these tests, `hf audit --all`, `repo-check`, then
`hyperframes check --strict` for every composition.

This test layer already paid for itself: it found that the caption packer's emergency length limit could
split `project.json` into `project.j` / `son`, contradicting its documented contract.

### M4. Semantic audio roles

Generated narration clips carry `data-audio-group="voiceover"`; a generated bed carries
`data-audio-group="music"`. This does not change timing or sound. It gives HyperFrames 0.8.11 a stable
bus to target when a real bed is later carved: adding slide 11 must not require editing a list of ten
voice clip ids.

## 2. Milestone K — language variants from one storyboard

### K1. Scope: a deliverable variant, not a second project

The first implementation supports one canonical locale plus one or more variants. Each variant owns:

- spoken narration and lower-third subtitle text;
- voice settings and pronunciation map;
- measured audio, timeline, slide-level and word-level captions;
- generated entry HTML and render output;
- an independent human-review verdict.

Titles, blocks, chart labels, and source labels must also be localizable before this may be called a
fully localized video. A release with English audio over unexplained zh-Hant evidence is a narration
variant, not an English edition; metadata and documentation must use the honest term.

### K2. Storyboard shape

Backward-compatible strings remain valid. A localizable field may instead be an object keyed by locale:

```jsonc
{
  "language": "zh-Hant",
  "locales": {
    "zh-Hant": { "default": true, "voice": { "name": "zh-TW-HsiaoChenNeural" } },
    "en":      { "voice": { "name": "en-US-JennyNeural" } }
  },
  "slides": [{
    "id": "slide-01",
    "title":     { "zh-Hant": "一份分鏡", "en": "One storyboard" },
    "subtitle":  { "zh-Hant": "兩個可審核版本", "en": "Two reviewable editions" },
    "narration": { "zh-Hant": "…", "en": "…" }
  }]
}
```

Known user-facing fields are resolved explicitly. The implementation must not recursively treat every
object as localized text; chart series, metric items, and configuration objects are data structures.

### K3. Commands and artifacts

The canonical locale keeps today's filenames. A variant is always explicit:

```text
hf prepare-tts --locale en  -> assets/audio/en/slide-NN.{display,tts}.txt
hf tts --locale en          -> assets/audio/en/slide-NN.mp3 + .words.json
hf measure --locale en      -> data/audio-durations.en.json
hf sync --locale en         -> data/timeline.en.json, captions/narration.en*.srt, index.en.html
hf review --locale en       -> review/en/index.html
```

`hf pipeline --locale en` composes those commands. No command may silently fall back from a missing
variant string to machine translation. A documented fallback to the canonical string is allowed only
for non-spoken visual fields and must produce an audit warning naming the field and slide.

### K4. Timing and status

Language variants have independent measured durations. They never share `data-start` values merely to
keep two renders the same length. The storyboard remains shared intent; measured speech remains the
clock for each deliverable.

Human review is also per variant. Passing zh-Hant does not pass English pronunciation or pacing.
`project.json` needs a generated `deliverables` map whose entries record duration, entry file, caption
files, render output, and review state. Root `status` continues to describe the canonical deliverable.

### K5. Acceptance

Use `storyboard-to-video-pipeline-demo` as the first two-locale fixture.

1. Existing string-only storyboards remain byte-compatible in their generated semantics.
2. Canonical and English pipelines run without copying the project.
3. Both entries pass `hf audit` and `hyperframes check --strict` with zero errors or warnings.
4. Both word-caption files remain inside their own timelines; alignment is measured with the existing
   display-text / engine-boundary method.
5. Two offline review kits exist and store verdicts under locale-specific keys.
6. Both human gates remain honestly `pending` until a person listens.

## 3. Deliberately deferred

- **Full-frame registry data composition (I):** useful for a deliberate visual moment, but it does not
  improve reproducibility or reach as much as K. Re-evaluate after the bilingual fixture.
- **A real music track and voiceover carve:** semantic groups are ready. Track sourcing still requires
  a rights decision or HeyGen sign-in; actual mix quality still requires listening.
- **Series identity (L):** wait for three published, human-approved releases.
- **Kokoro as a normal provider:** wait for the blind listening verdict; measurements do not decide taste.

## 4. Rules for the next implementation

1. Add locale handling as a resolver around the existing pipeline; do not fork the pipeline per language.
2. Keep generated variants beside the canonical artifacts and make their names predictable.
3. Test canonical backward compatibility before generating any new voice audio.
4. Never mark a locale reviewed because another locale passed.
5. Update this design with as-built differences; the difference between the sketch and evidence is part
   of this repository's research value.
