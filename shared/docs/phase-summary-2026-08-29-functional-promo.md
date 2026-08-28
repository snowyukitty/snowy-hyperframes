# Phase summary — Agent Orchestrator functional promo

Date: 2026-08-29

## Outcome

The rejected 30-second Agent Orchestrator candidate has been superseded. Its
generic dark-office scenes did not demonstrate a feature or help a viewer
understand the product. The new local review candidate is proof-first:

| Candidate | Spoken master | Duration | Shared cues | Browser gate | Human gate |
| --- | --- | ---: | ---: | --- | --- |
| Functional hero | English, `en-US-JennyNeural` | 50.6 s | 15 × 3 tracks | strict, 0 errors / 0 warnings, 10/10 contrast | pending |

Its four beats use the real Agent Orchestrator renderer with disclosed inert
fixture data: visible workflow, `2 / 3` Join barrier, `3 / 3` explicit result
handoff, protected Run Journal, then verified conceptual key art for the GitHub
call to action. No account, agent, PTY, or production journal was opened.

The offline review kit is:

```text
claude/projects/agent-orchestrator-functional-hero/review/index.html
```

The production project remains ignored. No MP4 was rendered, released,
uploaded, or committed, and no paid generation credit was used.

## System improvements

- Added `shared/docs/product-proof-video-standard.md`, defining an evidence
  ladder, fixture receipts, story contract, trilingual delivery, and the human
  gate.
- Fixed `hf snapshot`: snapshots created in its isolated locale workspace are
  now persisted before cleanup. Canonical snapshots retain other locale
  directories; non-canonical snapshots are saved under `snapshots/<locale>/`.
  A regression test covers both paths.

## Source-side evidence

The `agent-orchestrator` repository owns its deterministic capture command and
three 1600×1000 PNGs. Its manifest records exact dimensions and SHA-256 hashes;
the field-guide check verifies those receipts and references. HyperFrames keeps
copied production assets local and records the same digests in `data/research.json`.

## Gate

Snowy reviews the full cinema pass plus English, Japanese, and Traditional
Chinese subtitle readability. Approval authorizes a clean render only.
Publication and GitHub Release assets still require separate explicit approval.

## Checkpoint evidence

- `node --test shared/tests/hf.test.mjs` — 25 / 25 passing.
- `node shared/tools/hf.mjs repo-check` — 565 tracked files, 8 tracked
  projects, 8 allowlisted; clean apart from the documented sparse-checkout
  note for four historical MP4s.
- `node shared/tools/hf.mjs audit --all` — 12 local projects, 0 errors.
- `npm run check -- --strict --all-locales` — all 11 local composition
  projects pass their browser gate.
- `npm run snapshot -- --at 2.4,15.2,30.2,43.1` — persisted five PNG frames
  plus `contact-sheet.jpg` after the wrapper fix; the contact sheet was
  visually inspected.
