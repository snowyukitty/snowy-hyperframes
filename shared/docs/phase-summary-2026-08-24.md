# Phase Summary — 2026-08-24: v4 reliability foundation

This session reviewed the repository from its contracts outward, checked the current upstream state,
and delivered the foundation for `design-v4.md`. The next product milestone is language variants from
one storyboard; this session made the existing single-locale pipeline safer to extend first.

## 1. Review outcome

The project's differentiator is not another collection of slide templates. It is the combination of
research provenance, zh-Hant display/TTS discipline, measured timing truth, reproducible artifacts, and
an inexpensive human gate. The next high-value capability is to preserve those properties across
multiple language deliverables without cloning a project.

Upstream had moved from the repository's 0.8.6 pin to 0.8.11. Releases 0.8.7–0.8.11 include semantic
audio groups and voiceover carving, Windows process fixes, a caption-heavy render fix, and a path
traversal fix. Every composition was probed on 0.8.11 before the pin changed.

## 2. What changed

### HyperFrames 0.8.11 and a quiet workstation

- All seven composition projects and the reusable template now pin `hyperframes@0.8.11`.
- `hf check` is the required wrapper: static audit first, then the pinned browser gate.
- Every non-interactive child launched by `hf` uses `windowsHide: true`. FFprobe, FFmpeg, Edge-TTS,
  npx, and headless verification no longer create a burst of short-lived console windows.
- Local browser gates were run sequentially. Interactive Studio preview remains intentionally visible.

### Explicit contracts instead of fixture luck

`shared/tests/hf.test.mjs` adds eight zero-dependency `node:test` contracts for:

- audio-driven and storyboard timing policies;
- two- and three-field legacy GSAP start arrays;
- identifier-safe caption packing and cue containment;
- line-chart endpoint geometry;
- semantic narration/music groups;
- compact generated slide DOM;
- minimal JSON-schema validation.

The tests found a real defect immediately: the caption packer's emergency ceiling could split
`project.json` into `project.j` / `son`. The ceiling now respects identifier boundaries.

CI now runs those tests, `repo-check`, `hf audit --all`, and `hyperframes check --strict` for every
composition rather than static lint alone. After the first remote run surfaced GitHub's Node 20 action-runtime
deprecation, the workflow also moved `actions/checkout` and `actions/setup-node` from v4 to v7. The v7 actions
use Node 24 natively, and the follow-up run completed without annotations.

### Audio prepared for the current upstream model

Generated narration clips carry `data-audio-group="voiceover"`; a generated bed carries
`data-audio-group="music"`. No audio or timing changed. A future carve can target the stable voiceover
group and continue to cover narration clips added later.

### Defects found by the stronger gate

| Project / surface | Finding | Fix |
| --- | --- | --- |
| Shared line chart | Final dot sat at `cx=1560`, so its 7 px radius was clipped | Inset plot endpoints by 10 px and clamp values to the declared viewport |
| Research video | Entry composition crossed the new large-file lint threshold | Compact only the generated region; storyboard remains the readable source |
| Cost benchmark | Final source note sat behind a three-line caption | Move it to a separate vertical zone; explicit 190.02 s check passes |
| Pi TTS research | Normal-flow header shifted the 100%-high main canvas 42 px downward | Make header/main absolute composition layers |
| Pi TTS research | 309-line entry failed the strict maintainability gate | Compact the legacy GSAP slide table and teach the patcher its three-field shape |
| GPT-Image quota research | Storyboard still named three shared images while HTML used slide-specific copies | Point each storyboard slide at its existing slide-specific file |

`hf html` + `hf sync` regenerated the three owned modern project regions. Timelines did not change;
their generated timestamps changed, as expected.

## 3. Verification actually run

| Check | Result |
| --- | --- |
| `node --test shared/tests/hf.test.mjs` | 8/8 pass |
| `node shared/tools/hf.mjs audit --all` | 8 projects, 0 errors / 0 warnings |
| `node shared/tools/hf.mjs repo-check` | clean |
| `block-vocabulary-reference` strict browser gate | pass; 54/54 contrast |
| `measurable-vs-audible-tts` strict browser gate | pass; 62/62 contrast |
| `storyboard-to-video-pipeline-demo` strict browser gate | pass; 18/18 contrast |
| `ai-tool-cost-benchmark` strict browser gate | pass; 76/76 contrast |
| `ai-2030-three-futures` strict browser gate | pass; 40/40 contrast |
| `gpt-image-2-quota-research` strict browser gate | pass; 67/67 contrast |
| `latest-tts-voice-clone-research` strict browser gate | pass; 75/75 contrast |
| GitHub Actions `validate` (`f230ffa`) | pass; [run #32680262467](https://github.com/snowyukitty/snowy-hyperframes/actions/runs/32680262467), all steps successful, zero annotations |

Total: 392/392 text contrast checks pass WCAG AA. Runtime, layout, and motion report zero findings
on the final strict passes.

## 4. Intentionally not done

- No render was started. Existing human gates remain pending, so rendering would violate the project contract.
- No human preview, pronunciation judgment, or TTS naturalness verdict was recorded.
- No sign-in, release, visibility change, LICENSE decision, or Atlas sibling-repository edit occurred.
- The pre-existing `.gitignore` change that ignores generated `mcps/` metadata was preserved as user/workspace policy work.

## 5. Next step

Implement `design-v4.md` §2 in backward-compatible slices: locale resolver and schema first, canonical
no-change tests second, then English artifacts for `storyboard-to-video-pipeline-demo`. Each locale gets
its own measured timeline, captions, review kit, and honest human-gate state.
