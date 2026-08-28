# Phase summary — 2026-08-27 (Agent Orchestrator promo pair)

Session by Claude Code under the lease `snowy-hyperframes/agent-orchestrator-promo`.
Two new claude-workflow projects were authored end to end up to (but not past)
the human preview gate. Nothing was committed and no allowlist was touched —
both projects remain git-ignored per the publication policy.

## What changed

- **`claude/projects/agent-orchestrator-overview-promo`** — 60–90 s product
  showcase for the sibling `agent-orchestrator` repo (Electron orchestrator
  for CLI AI agents). Six slides, 88.2 s: what it is → assurance levels
  (L1 routed / L2 env-only, deliberately never called "isolated" / L0 native)
  → `Send to All` fan-out + `Join Agents` barrier → durable run journal →
  fail-closed safety posture → outro. `sourceConfidence: official-only`; every
  claim mapped to the product's own README/architecture/AGENTS docs in
  `data/research.json` and `docs/references.md`. No bitmaps.
- **`claude/projects/agent-orchestrator-5h-window-explainer`** — flagship
  explainer of the 5-hour usage-window pre-warm trick, faithful to
  `agent-orchestrator/docs/five-hour-window.md`. Six slides, 90.0 s. The
  centerpiece is a `split`-chart timeline (05:00 ping → 4 h standby / 1 h work
  in window one / 5 h window two) plus a bar chart of second-window waiting
  time (5 h vs 1 h after a 09:00 sit-down — arithmetic on the doc's example,
  disclosed in references). Honest limits kept on screen: shifts a paid
  window, creates no free usage, weekly/monthly caps unaffected.

## What was verified

Per project: `npm run html`, `npm run pipeline` (Edge-TTS → ffprobe → sync →
audit, 0 errors 0 warnings), `npm run check` (hyperframes@0.8.11 strict —
overview: contrast 52/52, all gates 0; 5h-window: contrast 55/55, all gates 0),
`npm run review` (self-contained kits at `review/index.html`, ~1.1–1.2 MB).
Repo-wide: `hf audit --all` 11 projects 0 errors; `hf repo-check` clean
(pre-existing sparse-checkout note only). Narrations were rewritten and
re-synthesized until measured totals landed inside 60–90 s; `durationTarget`
values are re-fitted to measured MP3 + 0.6 s pad.

## Exact next steps

1. Snowy opens both `review/index.html` kits, runs the cinema pass, and ticks
   the per-slide gates (pacing / pronunciation / readability).
2. Only after the gate: `npm run render` in each project; renders go to
   GitHub Releases, not git.
3. Publication of either project folder requires the
   `repo-publication-policy.md` review before any allowlist change.
