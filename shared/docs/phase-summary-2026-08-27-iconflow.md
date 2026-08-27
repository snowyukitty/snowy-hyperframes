# Phase Summary — 2026-08-27: IconFlow hybrid launch cut

This session replaced an unclear abstract opening in the private IconFlow promo
project with a literal product story: one exact source icon enters a physical
inspection frame, the real Review Lab proves it at 16px, and the checked-in
output family ships to every target surface.

## What changed

- Renamed the ignored production project to
  `codex/projects/iconflow-one-source-every-surface` and kept it private under
  the default publication policy.
- Selected one 8-second Google Flow Quality plate after a Lite → Fast → Quality
  evidence ladder. The plate contains only an empty physical frame and bench.
- Added the exact checked-in IconFlow 128px icon as a deterministic 2× layer
  after the generated frame stops. Product words, proof, receipt claims, and
  outputs remain deterministic HyperFrames content.
- Rewrote the three beats to `One SVG enters` → `Prove it at 16px` →
  `Ship every surface` and regenerated the storyboard-owned HTML region.
- Removed the superseded abstract Coral Gate bitmap from the private project.

## What was verified

- Flow winner: H.264 1280×720 at 24 fps, AAC stereo at 48 kHz, exactly 8.0 s.
- `npm run check`: 0 audit errors / warnings; 0 lint, runtime, layout, or motion
  findings; 9 layout samples; 21/21 contrast checks pass WCAG AA.
- `npm run review -- --artifact`: three-frame self-contained review kit built.
- Additional snapshots at 0.5, 2.8, 3.7, 5.8, and 11.5 seconds were visually
  inspected; the exact icon is centered inside the stopped physical frame.

## Cost observation

The Flow composer quoted 10, 20, and 100 credits for the three explicit runs.
The settled account balance nevertheless fell by 300 during the production
window and the activity ledger showed additional delayed debits. Generation
stopped immediately. Future credit budgets must use the settled ledger as the
authoritative value instead of relying only on the composer estimate.

## Exact next step

Snowy opens
`codex/projects/iconflow-one-source-every-surface/review/review.artifact.html`,
runs the cinema pass, and judges pacing, real-time audio, readability, and
icon/frame registration. Only after that human gate may `npm run render` create
the MP4; the render belongs in a release workflow, not Git history.
