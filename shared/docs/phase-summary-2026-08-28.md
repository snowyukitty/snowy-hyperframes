# Phase summary — 2026-08-28 (Windows console-window fix, upstream triage)

Short tooling session. Diagnosed why HyperFrames runs still flooded the desktop
with foreground console windows on Windows despite `hf`'s blanket
`windowsHide: true`, fixed it at the wrapper level, and triaged the issue
upstream instead of duplicating an existing PR.

## What changed

- **`shared/tools/hf.mjs`** — new `npxEnv()` (exported) injects
  `HYPERFRAMES_NO_TELEMETRY=1` into every `runNpx` child. Root cause: the
  HyperFrames CLI flushes telemetry on exit by spawning a detached
  `node -e fetch(PostHog)` child **without** `windowsHide`
  (`src/telemetry/transport.ts` in the 0.8.16 dist). A detached console child
  gets its own visible window, and our `windowsHide` on the npx call cannot
  reach a grandchild's own detached spawn — so every CLI invocation flashed a
  console for up to 5 s, dozens per pipeline. With telemetry opted out via the
  CLI's documented env switch, events never enqueue and the uploader never
  spawns. An explicit `HYPERFRAMES_NO_TELEMETRY` in the caller's environment
  still wins over the injected default.
- **`shared/tests/hf.test.mjs`** — regression test for `npxEnv()` (default
  opt-out, caller override via env, caller override via opts).
- **`AGENTS.md`** — documented the telemetry opt-out and the known residual:
  `hyperframes preview` from a non-TTY shell falls back to background mode and
  its detached server owns one persistent console window (upstream, not
  fixable from the wrapper; run preview from a real terminal).

## Upstream state (heygen-com/hyperframes)

Did **not** open a PR — the exact fix is already in flight upstream:

- Issue **#3476** (open) describes the same three `detached: true` spawns
  missing `windowsHide`; PR **#3478** (open, review pending) fixes all three
  (telemetry transport, preview lifecycle, browser open).
- Broader sweep: #3379/#3430 (merged: ffmpeg, Chrome), #3500 (open: fix landed
  in engine only), PR **#3529** (open: studio-server/lint/cli sweep).
- Posted an independent confirmation + the `HYPERFRAMES_NO_TELEMETRY=1`
  workaround on #3476:
  <https://github.com/heygen-com/hyperframes/issues/3476#issuecomment-5447700635>
- Once #3478/#3529 merge and a fixed version is pinned, the wrapper's opt-out
  is still worth keeping (telemetry off is desirable in itself).

## What was verified

`node --test shared/tests/hf.test.mjs` — 21/21 pass (includes the new test).
`hf audit --all` — 11 projects, 0 errors. `hf repo-check` — clean
(pre-existing sparse-checkout note only). The absence of window flashes is
inherently visual; the causal chain was verified by reading the 0.8.16 dist
(`flushSync` guarded by `buildPayload == null` when telemetry is disabled).

## Exact next steps

1. Nothing blocking. When bumping the HyperFrames pin past the upstream fix,
   re-check whether the preview background-console residual is gone.
2. The 2026-08-27 promo pair still awaits its human preview gate (see
   `phase-summary-2026-08-27.md`).
